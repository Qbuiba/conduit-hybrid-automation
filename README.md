# Conduit Hybrid Automation Framework

[![e2e](https://github.com/Qbuiba/conduit-hybrid-automation/actions/workflows/ci.yml/badge.svg)](https://github.com/Qbuiba/conduit-hybrid-automation/actions/workflows/ci.yml)

A **hybrid (API + UI) Playwright + TypeScript** test framework for the
[RealWorld "Conduit"](https://github.com/gothinkster/realworld) app. It demonstrates
fast, parallel-safe, pipeline-stable end-to-end testing built around one core idea:

> **API setup → UI action → API verify** — drive the feature through the real browser,
> then confirm it actually persisted by reading back through the API.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full design.

## What is Conduit?

Conduit is the reference application of the [RealWorld](https://realworld.io) project —
essentially a **Medium.com clone**: a social blogging platform. It's a deliberately
realistic, non-trivial app, which makes it a good target for end-to-end testing. Its
features (all exercised by this suite):

- **Auth** — sign up, log in, log out (JWT-based)
- **Articles** — create, read, edit, and delete Markdown articles
- **Feeds** — a global feed and a personalized "Your Feed" of followed authors, paginated
- **Comments** — add and remove comments on an article
- **Favorites** — favorite / unfavorite articles (with live counts)
- **Follow** — follow / unfollow other authors
- **Tags** — tag articles and filter the feed by tag
- **Profiles & settings** — view author profiles and edit your own account

## What's inside

- **API service layer** (`src/api/services`) — typed wrappers per domain (Auth, Article,
  Comment, Favorite, Profile, Tag, User), dependency-injected with an `APIRequestContext`.
- **Page Object Model** (`src/ui`) — pages + reusable components, role/text-based locators.
- **Facade** (`src/api/facade.ts`) — high-level helpers (`signInViaApi`, `publishArticleAs`).
- **Auth via setup project + storageState** — authenticate once, reuse everywhere.
- **Custom fixtures** (`fixtures/`) — services, pages, and reverse-order article teardown.
- **30 tests** across pure-API, pure-UI, and hybrid E2E (incl. a full pure-UI user journey).

## AI self-healing debug loop

When a test fails, the framework doesn't just go red — it runs a **deterministic triage
loop** (reproduce → classify → act → verify) that works out *who* is at fault and acts on
it. It runs locally in Claude Code via the `/debug-failure` command, and in CI as an
opt-in job. See [`docs/AI-DEBUG.md`](./docs/AI-DEBUG.md) for the full design.

### How it decides who's to blame

It uses the framework's own hybrid oracle as the judge — **mechanically, not by guessing**:

> The spec did **API setup → UI action → API verify**. So after a failure, the loop drives
> the action again and re-reads the API. If the UI action *succeeded* but the **API
> read-back disagrees**, the app is buggy. If the API is *correct* but the assertion still
> failed, the **test** is wrong.

### What it does about it

| Verdict | What the loop does |
|---|---|
| **TEST defect** — wrong locator / bad assertion / missing `await` | **Auto-fixes the test** (minimal change: a role-based locator, a web-first assertion, an API read-back instead of a flaky UI-state check), then **re-runs that spec with `--repeat-each` until it's green and deterministic**, and finally re-runs the owning slice to prove no regression. |
| **SUT defect** — a real bug in the app | **Never touches the app and never weakens the assertion.** It writes a structured bug report under `.debug-reports/` from the [`sut-bug` template](./.github/ISSUE_TEMPLATE/sut-bug.md) — including a browser-independent `curl` repro and the API-oracle evidence — then marks the spec `test.fixme('SUT bug: <link>')` so the suite **documents** the defect (stays green) instead of **hiding** it. |
| **ENVIRONMENT** — SUT down | Reports it (API/UI/Postgres health) and stops, instead of misdiagnosing app logic. |
| **FLAKY** — intermittent | Treated as a test defect: it finds the race (a missing `await` or a poll-free read-back) and stabilises it. |

Every run leaves an audit trail in `.debug-reports/<spec>-<timestamp>.md` for human review;
it reproduces before concluding and makes only minimal, idiomatic changes.

### Running it

- **Locally** (interactive, inside Claude Code): `/debug-failure` triages the last run, or
  `/debug-failure <spec>` targets one. `npm run triage` produces just the failure bundle.
- **In CI** ([`.github/workflows/ci.yml`](./.github/workflows/ci.yml)): on failure it
  **always** runs `scripts/triage.mjs` (verdict + per-spec breakdown into the job summary,
  uploaded as a `debug-bundle` artifact). The **AI pass is opt-in**: it only runs when an
  `ANTHROPIC_API_KEY` repo secret is set, so forks and key-less runs skip it cleanly and CI
  never breaks. Enable it with:
  ```bash
  gh secret set ANTHROPIC_API_KEY --repo <owner>/<repo>
  ```
  In CI the loop is read-only toward `main` (it diagnoses, fixes-and-proves in the runner,
  and writes its report to the job summary — it does not push commits).

## Prerequisites

- Node 20+
- Docker (for the Postgres container) — or any Postgres reachable at `localhost:5432`

## Running locally

The System Under Test (the Conduit app) is **not vendored** here — clone and run it
alongside the framework:

```bash
# 1. Start Postgres
docker compose up -d postgres

# 2. Clone + run the Conduit app (separate repo)
git clone https://github.com/TonyMckes/conduit-realworld-example-app.git
cd conduit-realworld-example-app
# point backend at Postgres (DEV_DB_DIALECT=postgres, host 127.0.0.1, db/user/pass = conduit)
npm install && npm run dev        # frontend :3000, API :3001
cd ..

# 3. Run the suite
npm ci
npx playwright install --with-deps chromium
npm test
```

## Useful scripts

| Command | What it does |
|---|---|
| `npm test` | Run the whole suite (headless, parallel) |
| `npm run test:headed` | Run with a visible browser |
| `npm run test:slow` | Headed + slowMo + single worker (watch the flow) |
| `npm run test:watch` | Playwright **UI Mode** — step through tests visually |
| `npm run test:api` / `:ui` / `:e2e` | Run just that slice |
| `npm run report` | Open the HTML report from the last run |
| `npm run triage` | Collect a failure-triage bundle (failures + SUT health) |
| `npm run codegen` | Record locators against the running app |

## CI

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs the whole suite on every
push/PR: Postgres as a service container, the Conduit app cloned + booted fresh, then the
Playwright suite, with the HTML report uploaded as a build artifact. Free on public repos.
