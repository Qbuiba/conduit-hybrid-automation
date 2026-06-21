# Conduit Hybrid Automation Framework

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
| `npm run codegen` | Record locators against the running app |

## CI

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs the whole suite on every
push/PR: Postgres as a service container, the Conduit app cloned + booted fresh, then the
Playwright suite, with the HTML report uploaded as a build artifact. Free on public repos.
