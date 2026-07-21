# FitLog E2E — Playwright Test Automation Framework

[![E2E](https://github.com/kakaul94-prof/fitlog-e2e/actions/workflows/e2e.yml/badge.svg)](https://github.com/kakaul94-prof/fitlog-e2e/actions/workflows/e2e.yml)
[![Latest test report](https://img.shields.io/badge/playwright-latest%20report-2EAD33?logo=playwright)](https://kakaul94-prof.github.io/fitlog-e2e/)

End-to-end test automation for **[FitLog](https://github.com/kakaul94-prof/FitLog)** — a live
React 19 + Supabase PWA for tracking nutrition, strength, cardio, and body weight.
Built with **Playwright + TypeScript (strict)**, a **Page Object Model** architecture,
cross-browser + mobile projects, and **GitHub Actions CI** that publishes the HTML
report to GitHub Pages on every run.

## What this demonstrates

- **Page Object Model** — locators and interactions live in `pages/`; specs read like
  user scenarios (`await loginPage.signIn(email, password)`).
- **Custom fixtures** — `fixtures/test-options.ts` extends Playwright's `test` so every
  spec receives typed, ready-made page objects.
- **Authenticate once, reuse everywhere** — `tests/auth.setup.ts` signs in through the
  real UI and saves `storageState`; all browser projects start authenticated.
- **Cross-browser + mobile** — Chromium, Firefox, WebKit, and a Pixel 7 viewport
  (FitLog is phone-first).
- **CI/CD** — typecheck + lint + tests on every push/PR; HTML report deployed to
  GitHub Pages even when tests fail.
- **Web-first assertions, no sleeps** — role/label/text locators, auto-waiting
  `expect(locator)` assertions, zero `waitForTimeout`.

## Running locally

```sh
npm ci
npx playwright install
cp .env.example .env   # then fill in the test-account credentials
npm test               # full matrix
npm run test:chromium  # single browser while iterating
npm run report         # open the HTML report
```

Environment variables (see `.env.example`): `BASE_URL`, `E2E_EMAIL`, `E2E_PASSWORD`,
plus `SUPABASE_URL` / `SUPABASE_ANON_KEY` for the API specs. Locally they come from a
gitignored `.env`; in CI they are repository secrets. No secrets are ever committed.

## Coverage

| Area | Spec | Status |
|---|---|---|
| Authentication (positive + negative) | `tests/auth.spec.ts` | ✅ |
| Navigation smoke (all tabs, no runtime errors) | `tests/navigation.spec.ts` | ✅ |
| Food diary logging + day totals (incl. quick add) | `tests/diary.spec.ts` | ✅ |
| Food search, manual food + USDA import, serving rescale | `tests/food-search.spec.ts` | ✅ |
| Recipes (ingredients → per-serving nutrition → log to diary) | `tests/recipe.spec.ts` | ✅ |
| Cardio + eat-back calories | `tests/cardio.spec.ts` | planned |
| Strength (sets, est. 1RM, last-time prefill) | `tests/strength.spec.ts` | planned |
| Body measurements → Progress | `tests/measurements.spec.ts` | planned |
| Streak indicator | with diary specs | planned |
| Calorie-goal settings | `tests/goals.spec.ts` | planned |
| Supabase REST API checks | `tests/api/diary.api.spec.ts` | planned |

## Design decisions

- **Tests target a deployed environment** (`BASE_URL`), not a local build — the suite
  verifies what users actually receive, and the same suite can point at any
  environment via env var.
- **Dedicated test account** — Supabase Row-Level Security is owner-only on every
  table, so E2E data is fully isolated from real accounts.
- **Idempotent, self-cleaning data** — specs that write use per-run unique values
  (and unique past dates for day-total assertions, so parallel projects sharing the
  account never collide) and delete what they create via the Supabase REST API with
  the test user's own token. A teardown project sweeps anything a crashed run left
  behind.
- **`storageState` auth** — one real-UI login per run instead of one per test:
  faster, and auth flakiness is confined to a single setup project.

## About the app under test

FitLog is a personal, phone-first fitness PWA (React 19, Vite, Tailwind v4, TanStack
Query, Supabase Postgres + Auth) — [repo](https://github.com/kakaul94-prof/FitLog) ·
[live app](https://fitlog-9wl.pages.dev). This framework lives in a separate repo, as
it would for an independent QA team.

## Future work

- Remaining flows in the coverage table; more data-driven cases.
- `data-testid` / `role="alert"` hooks in the app for the few elements that lack
  accessible handles (e.g. the login error paragraph).
- Visual regression snapshots, accessibility scans (axe), API contract tests.
