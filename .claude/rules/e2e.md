---
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

Config runs Chromium only, `workers: 1` (sequential) with `retries: 2`, plus setup and teardown projects. The
`chromium` project runs every spec except `tests/platforms/`, which belongs to one project per platform: `opencti`
runs `tests/platforms/opencti/` and `openaev` runs `tests/platforms/openaev/`.

## Platform registration tests

`tests/platforms/` connects a real OpenCTI or OpenAEV to XTM Hub from the platform's own settings: the platform opens
XTM Hub in a new tab and XTM Hub answers with `postMessage`. It also deploys a resource in one click (an OpenCTI custom
dashboard, an OpenAEV scenario, from the importable exports in `tests/tests_files/assets/`), and checks that each visit
of the platform's Filigran Experience settings updates `PlatformConfiguration.last_connectivity_check`. For OpenCTI, a
dashboard published in XTM Hub must reach its News Feed and open back in XTM Hub: OpenCTI pulls that feed only from its
`hub_registration_manager` job, which the compose override runs every second. `opencti/redirections.spec.ts` covers
the other redirections between OpenCTI and XTM Hub: the one-click deploy of each OpenCTI resource type, and every OpenCTI
link that opens XTM Hub; `openaev/redirections.spec.ts` does the same for every OpenAEV link to XTM Hub. A CI leg runs
the project of its platform. Their page models are in `tests/model/platforms/`.
Each spec skips unless `OPENCTI_URL` or `OPENAEV_URL` is
set, so a plain `yarn test:e2e` reports them as skipped. They run against the `rolling` images through
`xtm-hub-dev/docker-compose-ci-opencti.yml` and `xtm-hub-dev/docker-compose-ci-openaev.yml`, layered on
`docker-compose-ci.yml`:

```bash
docker compose -f xtm-hub-dev/docker-compose-ci.yml -f xtm-hub-dev/docker-compose-ci-opencti.yml run e2e sh -lc "yarn test:e2e --project=opencti"
```

The platform must start after the Hub frontend is healthy: OpenAEV checks once, at startup, that it can reach XTM Hub.
The Hub database is reset before each test and the platform drops a registration XTM Hub no longer knows, so every
test starts from "Not connected".

## Layout

```
tests/fixtures/       Playwright fixtures
tests/model/          Page object models (`platforms/`: the screens of OpenCTI and OpenAEV)
tests/db-utils/       Database setup/teardown helpers
tests/utils/          Shared helpers
tests/tests_files/    Specs, grouped by feature, and their test data
tests/platforms/      Specs against a real OpenCTI / OpenAEV (one folder and project per platform)
tests/__screenshots__/ Visual regression baselines, created by the first `toHaveScreenshot` baseline
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

See [`ci.md`](ci.md) for the exact copy command. Those copies are build
artifacts — do not edit them here, change the backend sources instead.
