---
description: Auto-debug a failed Playwright test in the Conduit hybrid framework. Reproduces the failure, classifies it as a TEST defect (flaky/wrong locator/bad assertion) vs a SUT defect (real app bug) vs an ENVIRONMENT issue, then either fixes the test and re-runs to green, or files a structured bug report — never editing the SUT.
---

# /debug-failure — self-healing triage for the Conduit hybrid framework

You are the framework's autonomous debugging engine. A test failed. Your job is to
drive a **deterministic triage loop**: reproduce → classify → act → verify, and stop
only when the suite is green again **or** you have produced a credible bug report for a
defect in the System Under Test (SUT).

The core invariant of this framework is the hybrid oracle:

> **API setup → UI action → API verify.** A spec drives the feature through the real
> browser, then reads back through the API to confirm it persisted.

That oracle is also your strongest classification tool: if the UI step "succeeded" but
the API read-back disagrees, the SUT likely has a real bug. If the API read-back is
correct but the assertion still failed, the **test** is wrong.

## Golden rules

1. **Never edit the SUT to make a test pass.** The SUT (`conduit-realworld-example-app`,
   or the CI-cloned `sut/`) is the thing under test. If it has a bug, you file a report —
   you do not patch it to turn the suite green. (The one historical exception, the
   Sequelize `logging` config crash, is already handled by CI `sed` and is an
   environment-bootstrap fix, not a "make the test pass" fix.)
2. **Fix tests, fixtures, page objects, and config — not assertions-to-match-bugs.**
   Weakening an assertion to swallow a real SUT bug is forbidden. If the app is wrong,
   say so.
3. **Reproduce before you conclude.** A single CI failure is a hypothesis, not a
   diagnosis. Confirm determinism before classifying.
4. **Minimal, idiomatic changes.** Match the surrounding code. No drive-by refactors.
5. **Leave an audit trail.** Whatever you conclude, write it to
   `.debug-reports/<spec>-<timestamp>.md` (gitignored) so a human can review.

---

## Step 0 — Gather the failure

If invoked with a spec name/grep as `$ARGUMENTS`, use it. Otherwise run the triage
collector, which parses the last JSON report and probes the SUT:

```bash
node scripts/triage.mjs
cat test-results/triage.md
```

Read `test-results/triage.json` for the structured failure list (error, stack, snippet,
trace path, SUT health). For each failing spec capture:
- the failing assertion (expected vs actual) and the file:line,
- the project (`api` / `chromium`),
- whether the SUT health probe passed.

**If `triage.json` verdict is `SUT-DOWN`** (health probes failed): stop classifying test
logic. The failures are environmental. Report:
- API up? `curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL/tags"`
- UI up? `curl -s -o /dev/null -w "%{http_code}" "$UI_BASE_URL"`
- Postgres up? `docker compose ps postgres`
Tell the user to bring the SUT up (`docker compose up -d postgres`, then `npm run dev`
in the app repo) and re-run. Do not proceed to Step 2.

---

## Step 1 — Reproduce in isolation

Run only the failing spec, headed-equivalent determinism check:

```bash
npx playwright test <file> -g "<title>" --project=<project> --repeat-each=3 --workers=1
```

- **Fails 3/3** → deterministic. Proceed to classify (Step 2).
- **Fails intermittently (e.g. 1/3)** → flaky. This is almost always a **TEST defect**:
  a missing `await`, a race against an async render, or a poll-free read-back. Jump to
  Step 3 with category = `FLAKY-TEST`.

Capture a trace if one isn't already present:

```bash
npx playwright test <file> -g "<title>" --project=<project> --trace=on
# inspect: npx playwright show-trace test-results/.../trace.zip
```

---

## Step 2 — Classify: TEST defect vs SUT defect

Use this decision tree. **Check the known-quirks table first** — most failures in this
framework map to an already-characterised app quirk, which tells you instantly whether
it's the test's responsibility to work around (TEST) or a genuine app bug (SUT).

```
Did the UI action appear to succeed (no error toast, navigation happened)?
├─ NO  → The UI couldn't perform the action.
│        ├─ Locator resolves to 0 / wrong element?              → TEST defect (selector)
│        ├─ Element present but app threw (500 / console error)? → SUT defect (bug report)
│        └─ Action needs auth and storageState wasn't applied?   → TEST defect (fixture/project)
│
└─ YES → Read back through the API (the oracle).
         ├─ API shows the change persisted correctly,
         │   but the test asserted otherwise            → TEST defect (assertion/expectation)
         ├─ API shows the change persisted correctly,
         │   but the UI never reflected it              → SUT defect (UI bug) — unless it's a
         │                                                 known non-re-render quirk (see table)
         └─ API shows the change did NOT persist / is
             corrupted / 500s                           → SUT defect (backend bug report)
```

### Known Conduit quirks (consult before classifying)

These were characterised when the suite was built. A failure matching one is **expected
app behaviour the test must accommodate** (TEST side) unless the symptom is new:

| Symptom | Reality | Side that owns it |
|---|---|---|
| Auth not applied in UI test | Frontend reads `localStorage["loggedUser"]` as `{headers:{Authorization:"Token <jwt>"},isAuth:true,loggedUser}` — **not** a bare token. See `src/utils/state.ts`. | TEST (fixture shape) |
| 401 on an API call | Header must be `Token <jwt>`, **not** `Bearer`. | TEST (client) |
| `GET /api/tags` returns `[]` even after tagged articles exist | Known SUT quirk. Don't assert tags via that endpoint. | SUT quirk (work around in test) |
| UI route assertion fails on `pathname` | App uses a **hash router**; `url.pathname` is always `/`. Assert on `url.hash`. Page objects build `${UI_BASE_URL}/#${path}`. | TEST |
| "Global Feed" / "Your Feed" click misses | They are `<button>`s, not links. | TEST (locator) |
| `PUT /api/user` 500 when updating settings | Backend `if (password !== undefined \|\| password !== "")` is always true → `bcryptHash(undefined)`. **Always include a password field** on API user updates. | SUT bug (already known) — test works around it |
| Author/comments briefly absent on article page | Page renders before its `getArticle` XHR resolves. `ArticlePage.gotoArticle` waits for `networkidle`. | TEST (wait) |
| Follow button never flips to "Unfollow" | `FollowButton` doesn't reliably re-render. **Verify follow via API poll**, not button text. | SUT quirk (verify via oracle) |
| Edited article fields get clobbered | React dev StrictMode double-invokes the editor's `getArticle` effect; the late response overwrites typed input. Edit via the article's "Edit Article" link (passes router state, skips the fetch). | SUT/dev-mode quirk — test navigates around it |
| `/profiles/undefined/follow` | Author not loaded yet when the action fired — add a `networkidle`/visibility wait. | TEST (wait) |

If the symptom is **new** (not in this table) and the API oracle says the data is
wrong/missing, treat it as a **genuine, previously-undiscovered SUT defect** → Step 4.

---

## Step 3 — If TEST defect: fix and re-run to green

1. State the root cause in one sentence (e.g. "assertion read the button label instead
   of polling the API; the label is a known non-re-render quirk").
2. Make the **minimal** change in the test / page object / fixture / config. Prefer:
   - replacing brittle waits with web-first assertions (`await expect(locator).toBeVisible()`),
   - replacing UI-state assertions with API read-back where a quirk prevents re-render,
   - fixing the locator to a role/text-based one,
   - correcting the fixture/storageState wiring.
3. Re-run the single spec until green and **deterministic**:
   ```bash
   npx playwright test <file> -g "<title>" --project=<project> --repeat-each=3 --workers=1
   ```
4. Then run the **full slice** to prove no regression:
   ```bash
   npm run test:api    # or :ui / :e2e, whichever owns the spec
   ```
5. Only if both pass, run the whole suite:
   ```bash
   npm test
   ```
6. Write the report (Step 5) and summarise the diff.

If three fix attempts don't make it deterministic, stop and escalate to the user with
what you tried and the trace — do not keep flailing.

---

## Step 4 — If SUT defect: file a bug report (do NOT touch the SUT)

Produce a report at `.debug-reports/BUG-<area>-<timestamp>.md` using the SUT bug
template (`.github/ISSUE_TEMPLATE/sut-bug.md` shape). It must include:

- **Title** — crisp, e.g. "PUT /api/articles/:slug drops `tagList` on update".
- **Layer** — backend API / frontend UI.
- **Reproduce via API** — the minimal `curl`/service call that shows the defect, so it's
  independent of the browser:
  ```bash
  TOKEN=...   # from AuthService.login
  curl -s -X PUT "$API_BASE_URL/articles/<slug>" \
    -H "Authorization: Token $TOKEN" -H 'Content-Type: application/json' \
    -d '{"article":{"title":"..."}}' | jq .
  ```
- **Expected vs Actual** — quote the RealWorld API spec expectation vs the observed
  response/state.
- **Oracle evidence** — the exact API read-back that proves the UI action didn't persist.
- **Trace** — `npx playwright show-trace <path>`.
- **Blast radius** — which specs this affects.
- **Suggested handling** — usually: keep the test asserting *correct* behaviour and mark
  it `test.fixme(reason)` with a link to the bug, so the suite documents the defect
  instead of hiding it. Show the exact `test.fixme`/`test.fail` annotation to add.

Then, in the test, apply the agreed annotation (`test.fixme`/`test.fail` with the bug
link) so CI stays green while the bug stays *visible*. This is the honest alternative to
weakening the assertion.

---

## Step 5 — Always: write the diagnostic report

Write `.debug-reports/<spec>-<timestamp>.md` containing:

```markdown
# Debug report — <spec title>
**Verdict:** TEST-DEFECT | SUT-DEFECT | ENVIRONMENT | FLAKY-TEST
**Spec:** `<file>:<line>` (<project>)
**Reproduced:** <3/3 deterministic | 1/3 flaky | SUT-down>

## Hybrid flow
API setup → UI action → API verify, with ✅/❌ on each hop and where it broke.

## Root cause
<one paragraph; cite file:line and, for SUT bugs, the API evidence>

## Action taken
- <diff summary OR "bug report filed: .debug-reports/BUG-...md + test.fixme added">

## Verification
- single spec: <result>  · slice: <result>  · full suite: <result>
```

Finish with a 3-line chat summary: **verdict, what changed, suite status.**

---

## Notes for cloud/CI runs

In CI this same prompt is fed to `claude -p` (see `.github/workflows/ci.yml`,
`ai-debug` job). There:
- the SUT is the freshly-cloned `sut/`; health-probe it the same way,
- do **not** push commits to `main`; produce the report + proposed patch as the job
  output/artifact (and a PR comment when running on a pull request),
- the same TEST-vs-SUT classification and golden rules apply unchanged.
