---
applyTo: 'apps/e2e/**'
paths:
  - "apps/e2e/**"
---

# E2E Instructions (`apps/e2e`)

Playwright, workspace `@xtm-hub/test_e2e`.

## Running

The frontend (**:3002**) and backend (**:4002**) must already be running, along with the Docker infrastructure. Base
URL comes from `E2E_BASE_URL`, defaulting to `http://localhost:3002`.

```bash
cd apps/e2e
yarn test:e2e                  # headless run
yarn test:e2e:ui               # Playwright UI mode
yarn test:e2e:update-snapshot  # refresh visual baselines
yarn generate-test-e2e         # codegen against the running app
yarn lint  /  yarn lint:fix
```

Config runs Chromium only, `workers: 1` (sequential) with `retries: 2`, plus setup and teardown projects.

## Layout

```
tests/fixtures/       Playwright fixtures
tests/model/          Page object models
tests/db-utils/       Database setup/teardown helpers
tests/utils/          Shared helpers
tests/webhooks/       Notification webhook for test reporting
tests/tests_files/    Test data files
tests/__screenshots__/ Visual regression baselines
```

## Conventions

- Put selectors and interactions in a **page object model** under `tests/model/`. Specs should read as a scenario,
  not a pile of locators.
- Prefer role- and label-based locators (`getByRole`, `getByLabel`) over CSS or XPath, so tests survive restyling.
- Never use fixed `waitForTimeout`. Rely on Playwright's auto-waiting and web-first assertions
  (`await expect(locator).toBeVisible()`).
- Tests run sequentially against a shared database. Create the data you need through `tests/db-utils/` and clean up
  after yourself; do not depend on another spec having run first.
- `retries: 2` masks flakiness. If a test only passes on retry, fix the race rather than leaving it.
- Update `tests/__screenshots__/` deliberately — review the visual diff before accepting a new baseline.

## CI coupling

See [`ci.md`](ci.md) for the exact copy command. Those two directories are build
artifacts — do not edit them here, change the backend sources instead.
