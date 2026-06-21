# Conduit Hybrid Automation Framework — Architecture & Technical Specification (v2)

> Revision of the original plan. Changes from v1 are called out in **▶ Revised** notes so the
> deviations from the source document are explicit.

This document is the architectural blueprint, design patterns, and API contracts for the Conduit
RealWorld Playwright framework. It targets execution speed, pipeline stability, and scalable code
structure, and is built around **hybrid testing**: set up state via fast API calls, perform the
action in the UI, then verify the result back through the API.

---

## 0. System Under Test (SUT)

**▶ Revised — backend selected.** The framework runs against a self-hosted, containerized Conduit
app rather than a shared hosted API. A hermetic environment is what makes "pipeline stability" and
safe parallel teardown real claims instead of aspirations.

- **App:** [`TonyMckes/conduit-realworld-example-app`](https://github.com/TonyMckes/conduit-realworld-example-app)
  — React (Vite) frontend + Express/Sequelize backend + PostgreSQL, single repo.
- **Frontend (UI tests):** `http://localhost:3000`
- **API (API tests + setup/teardown):** `http://localhost:3001/api`
- **Containerization:** the repo ships no Docker, so we add a `docker-compose.yml` (app + postgres).
  Playwright's `webServer` block boots it before the suite; CI gets a clean DB per run.
- **Swap-ability:** everything speaks the standard RealWorld `/api` contract, so the SUT can be
  replaced (e.g. with `gothinkster/node-express-realworld-example-app` + official frontend) without
  touching test logic — only base URLs change.

---

## 1. High-Level System Architecture

Three layers enforce separation of concerns, so API contracts can change without breaking UI tests
and UI locators can change without breaking data setup.

- **Layer 1 — UI:** Playwright browser contexts, Page Object Models, UI assertions.
- **Layer 2 — API:** `APIRequestContext`, Service classes, JWT management, **API-based**
  seeding/teardown. **▶ Revised:** v1 said "direct database seeding/teardown" — there is no direct
  DB access; all setup/teardown goes through HTTP endpoints. Direct DB access is only an option if
  the compose stack exposes Postgres and we choose to use it (not planned for v1).
- **Layer 3 — Test Execution:** spec files using the Playwright Test runner, combining Layers 1 & 2
  for hybrid scenarios.

### Directory Structure

```
conduit-framework/
├── src/
│   ├── api/
│   │   ├── clients/        # Base request config (headers, base URL, APIRequestContext factory)
│   │   └── services/       # Endpoint wrappers (AuthService, ArticleService, CommentService,
│   │   │                   #   FavoriteService, ProfileService, TagService)
│   ├── ui/
│   │   ├── components/      # Reusable UI parts (Navbar, Footer, Pagination, ArticlePreview)
│   │   └── pages/          # Page Objects (Home, Editor, Article, Settings, Login, Register, Profile)
│   └── utils/
│       ├── dataGen.ts      # Dynamic input/data generation
│       └── state.ts        # JWT extraction + localStorage injection helpers
├── tests/
│   ├── api/                # Pure API contract & business-logic tests
│   ├── ui/                 # Pure UI validation (unauthenticated states)
│   └── e2e/                # Hybrid tests (API setup → UI action → API verify)
├── fixtures/               # ▶ Revised — custom Playwright fixtures (see §2)
├── playwright/.auth/       # ▶ Revised — storageState JSON output (gitignored)
├── docker-compose.yml      # ▶ Revised — containerized SUT
├── global.setup.ts         # ▶ Revised — setup *project* (not legacy globalSetup)
├── playwright.config.ts
└── package.json
```

---

## 2. Design Patterns

- **Page Object Model (POM):** UI locators + interactions encapsulated per page; no locator
  duplication across specs.
- **API Service Pattern:** endpoints wrapped in domain classes (`ArticleService.create()`). Tests
  never touch raw URLs or headers. **▶ Revised:** services are **constructed with an
  `APIRequestContext`** (dependency-injected), not a global import — so the same service works from
  the `request` fixture in API tests and from the setup project.
- **Facade Pattern:** high-level helpers combining multiple actions, e.g.
  `AppFacade.publishArticleAndNavigate()`. **▶ Revised:** facades **return the created entity**
  (e.g. the article `slug`) so tests can assert and tear down precisely.
- **Data-Driven Testing (DDT):** test blocks iterate over arrays of valid/invalid datasets.
- **Auth State — setup project + storageState.** **▶ Revised (supersedes v1 "Singleton per
  worker").** A `global.setup.ts` setup project registers a user via API, logs in, and writes the
  JWT into a `storageState` JSON (including the `localStorage` key Conduit reads, `jwtToken`). UI
  projects declare `storageState` + `dependencies: ['setup']` and start already authenticated. This
  is shared/read-only across workers — safer than per-worker re-auth and the idiomatic Playwright
  approach.
- **Fixtures over raw hooks.** **▶ Revised:** prefer custom fixtures (`fixtures/`) for data
  lifecycle and POM injection rather than `beforeEach`/`afterEach`. Worker-scoped, auto-applied,
  composable. `afterEach`-style teardown still exists but is driven through a fixture that tracks
  created entities and deletes them in reverse order.

---

## 3. Core Functions & Utilities

- **`generateDynamicUser()`** — unique `{email, password, username}` payloads to avoid DB collisions
  during parallel execution.
- **`injectSession(token)`** — injects a JWT into `window.localStorage` before navigation to bypass
  the UI login. **▶ Revised:** reserved for tests needing a *fresh, isolated* user mid-test (e.g.
  parallel-collision scenarios); the *shared* authenticated user comes from the setup project's
  storageState, so most tests don't call this.
- **`apiTeardown(slug)`** — DELETEs an article during cleanup. **▶ Revised:** invoked via the
  tracking fixture, not a bare `afterEach`. Note: registered test users leak by design — the clean
  DB per CI run (compose teardown) covers that; no per-user delete endpoint is required.

---

## 4. API Specification (Conduit Endpoints)

Integrated under `src/api/services/`. These are both targets for pure API tests and the
setup/teardown mechanism for hybrid UI tests. **▶ Revised:** all domains below are **in scope for
the first build** (Auth, Profile, Articles, Comments, Favorites, Tags).

| Domain | Method | Route | Primary Framework Usage |
|---|---|---|---|
| Authentication | POST | `/api/users` | Register a new dynamic user for isolated execution. |
| Authentication | POST | `/api/users/login` | Authenticate; retrieve JWT for UI injection. |
| Profile | GET | `/api/profiles/{username}` | Verify profile data matches the UI dashboard. |
| Articles | POST | `/api/articles` | Seed an article directly prior to UI testing. |
| Articles | GET | `/api/articles/{slug}` | Validate UI edits updated the backend. |
| Articles | DELETE | `/api/articles/{slug}` | Clean up test data (via teardown fixture). |
| Comments | POST | `/api/articles/{slug}/comments` | Seed comments to test UI comment-feed rendering. |
| Favorites | POST | `/api/articles/{slug}/favorite` | Increment favorite count to test UI reactive changes. |
| Tags | GET | `/api/tags` | Fetch tags to drive parameterized UI filtering tests. |

---

## 5. Open Items Before Build

1. Confirm `TonyMckes` as the SUT (vs. node-express + official frontend alternative).
2. Verify the chosen frontend reads JWT from `localStorage['jwtToken']` (drives the storageState
   shape); adjust the setup project if the key differs.
3. Decide CI provider for the `webServer`/compose orchestration (affects `process.env.CI` gates
   already in `playwright.config.ts`).

---

## 6. CI/CD Pipeline (GitHub Actions)

The containerized SUT makes the pipeline self-contained — no external environment, no shared test
data, fresh DB per run. This is what backs the "pipeline stability" goal.

### Flow

```
push / PR ─▶ GitHub Actions runner
   1. (get the Conduit app — see layout note below)
   2. docker compose up -d        # frontend + backend + postgres
   3. wait for http://localhost:3001/api to be healthy
   4. npx playwright install --with-deps
   5. npx playwright test         # suite hits :3000 (UI) + :3001/api (API)
   6. upload HTML report + traces as build artifacts (esp. on failure)
   7. docker compose down         # clean DB discarded, no leaked data
```

### "Trigger tests after build"

Single workflow, sequenced jobs: a `build` job (compose up + health check) gates a `test` job via
`needs: build`, so tests run only if the app booted. (A cross-repo `workflow_run` trigger is only
needed if the app and tests live in separate repos and one must remotely kick the other.)

### Already wired

`playwright.config.ts` gates on `process.env.CI` (GitHub sets `CI=true` automatically):
`retries: 2`, `workers: 1`, and `forbidOnly` (fails the build on a stray `test.only`). No extra work
to activate.

### ⚠ Pending — repo layout (decide at scaffold time)

Only **step 1** depends on layout; everything else is identical:
- **Standalone tests repo:** CI clones / submodules the Conduit app, then `compose up`.
- **Monorepo:** app is already checked out; CI just `compose up`.

---

### Sources
- [RealWorld (gothinkster/realworld)](https://github.com/gothinkster/realworld)
- [TonyMckes/conduit-realworld-example-app](https://github.com/TonyMckes/conduit-realworld-example-app)
- [DigitalInnovationOne automation fork](https://github.com/digitalinnovationone/conduit-realworld-example-app-with-cypress-automation)
- [gothinkster/node-express-realworld-example-app](https://github.com/gothinkster/node-express-realworld-example-app)
