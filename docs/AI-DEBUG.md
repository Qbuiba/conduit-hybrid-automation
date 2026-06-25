# AI Self-Healing Debug Loop

When a test fails, this framework doesn't just go red — it runs a **deterministic triage
loop** that reproduces the failure, decides whether the *test* or the *application* is at
fault, and then either fixes the test and re-runs to green, or files a structured bug
report against the app. The same loop runs locally (interactively) and in the cloud (CI).

It is built directly on the framework's hybrid oracle:

> **API setup → UI action → API verify.** The API read-back is what lets the loop tell a
> *test defect* (the app is fine, the test is wrong) from a *SUT defect* (the app has a
> real bug) — mechanically, not by guessing.

## The loop

```
        ┌──────────────┐
        │  test fails  │
        └──────┬───────┘
               ▼
   ┌───────────────────────┐   node scripts/triage.mjs
   │ 0. Gather + probe SUT │── parses the JSON report, probes API+UI health,
   └──────────┬────────────┘   emits test-results/triage.{json,md}
              ▼
   ┌───────────────────────┐   SUT-DOWN?  → report environment, stop.
   │ 1. Reproduce isolated │── --repeat-each=3 --workers=1
   └──────────┬────────────┘   intermittent? → FLAKY-TEST
              ▼
   ┌───────────────────────┐   UI action succeeded but API read-back disagrees?
   │ 2. Classify via oracle│── → SUT defect.   API correct but assertion failed?
   └──────┬─────────┬──────┘   → TEST defect.  (Known-quirks table consulted first.)
          │         │
   TEST   ▼         ▼  SUT
 ┌─────────────┐ ┌──────────────────────────┐
 │ 3. Fix test │ │ 4. File bug report;      │
 │   + re-run  │ │    annotate test.fixme   │
 │   to green  │ │    (never weaken assert) │
 └──────┬──────┘ └────────────┬─────────────┘
        └───────┬─────────────┘
                ▼
        ┌───────────────┐
        │ 5. Write report│  .debug-reports/<spec>-<ts>.md
        └───────────────┘
```

## Running it locally

Inside Claude Code, from `conduit-framework/`:

```
/debug-failure                      # triages whatever failed in the last run
/debug-failure edit-article         # triage a specific spec by name/grep
```

The command definition lives in [`.claude/commands/debug-failure.md`](../.claude/commands/debug-failure.md).
You can also produce just the triage bundle without the AI:

```bash
npm run triage      # writes test-results/triage.{json,md}
```

## Running it in the cloud (CI)

The [CI workflow](../.github/workflows/ci.yml) does two things on failure:

1. **Always** runs `scripts/triage.mjs`, which appends a verdict (`SUT-DOWN` /
   `NEEDS-TRIAGE` / `FLAKY`) and a per-spec failure breakdown to the **job summary**, and
   uploads a `debug-bundle` artifact (triage JSON/MD + any `.debug-reports/`).
2. **Opt-in** runs an AI debug pass with the Claude Code CLI headlessly
   (`npm i -g @anthropic-ai/claude-code` → `claude -p … --permission-mode bypassPermissions`).
   It reproduces and classifies the failures against the still-running SUT, fixes a test
   defect and re-runs it (or writes a bug report for a SUT defect), and streams its
   diagnosis to the job summary. Using the CLI directly means the only thing you need is
   the API-key secret — **no GitHub App or OIDC setup**.

### Enabling the cloud AI pass

It is **gated on a secret**, so a fork or a key-less run simply skips it — CI never breaks:

```
Repo → Settings → Secrets and variables → Actions → New repository secret
  Name:  ANTHROPIC_API_KEY
  Value: <your key>
```

The step's guard is the standard env-var workaround (you can't read `secrets` in a
job-level `if:`):

```yaml
- name: AI auto-debug failing tests
  if: ${{ failure() && env.HAVE_ANTHROPIC_KEY == 'true' }}
  env:
    HAVE_ANTHROPIC_KEY: ${{ secrets.ANTHROPIC_API_KEY != '' }}
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: |
    npm install -g @anthropic-ai/claude-code
    claude -p "…follow .claude/commands/debug-failure.md…" \
      --max-turns 25 --permission-mode bypassPermissions \
      --output-format text >> "$GITHUB_STEP_SUMMARY" 2>&1 || true
```

In CI the loop is **read-only toward `main`**: it never pushes commits or edits the cloned
SUT. It produces a diagnosis + proposed patch as job output, and (on pull requests) can
comment. A human stays in the loop for anything that lands.

## Design guarantees

- **The SUT is never patched to make a test pass.** A real app bug becomes a bug report +
  a visible `test.fixme`, not a weakened assertion.
- **No conclusion without reproduction.** A single CI flake is a hypothesis; the loop
  confirms determinism with `--repeat-each` before classifying.
- **Every run leaves an audit trail** under `.debug-reports/` (gitignored) for human review.
- **Token/cost bounded** in CI via `--max-turns`.
