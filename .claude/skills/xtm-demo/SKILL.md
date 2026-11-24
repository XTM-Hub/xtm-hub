---
name: xtm-demo
description: >-
  Produces a PR demo (screenshot or video) of a change by running it locally: starts the podman dependencies, serves
  XTM Hub from a given worktree in e2e mode, optionally starts OpenAEV or OpenCTI next to it for cross-product tickets,
  then records the demo with XTM Hub's Playwright demo setup (`apps/e2e/playwright.demo.config.ts`). Use when the user
  asks for a demo, screenshot or video of an XTM Hub / OpenAEV / OpenCTI change, or when `implement-ticket` reaches its
  demo step.
argument-hint: "<issue or PR number> <hub tree path> [openaev|opencti]"
model: sonnet
---

# XTM demo

Runs the change for real on this machine and records what a reviewer should see. The result is files on disk for the
user to drag into the PR description: this skill never uploads, commits or pushes anything.

## Inputs

Ask the caller or the user only for what is missing:

- `ID`: ticket or PR number, used to name the output folder.
- `HUB_TREE`: the XTM Hub tree that holds the change (a worktree, or the main checkout). Everything about Hub runs
  from there, so the demo shows the branch and not whatever the user's own dev stack happens to run.
- `MAIN_CHECKOUT`: the XTM Hub main checkout, whose `node_modules` the worktree reuses (a worktree has no
  `apps/e2e` dependencies of its own; copy them as the caller does, or run Playwright from the main checkout).
- `PRODUCTS`: `hub` alone, `hub + openaev` or `hub + opencti`. Cross-product means the ticket touches a product
  talking to Hub (registration, news feed, one-click deploy, redirections, platform settings). When the ticket also
  changes the product itself, ask which branch or worktree of it to run: never switch the user's checkout.
- `SCENARIO`: what to show, as 2 to 6 observable steps taken from the ticket's acceptance criteria.
- `FORM`: `screenshot`, `video`, or `none`, chosen below.

Output folder: `<MAIN_CHECKOUT>/../xtm-hub-demos/<ID>/` (create it; it is outside every repository).

## 1. Choose the form

| The ticket changes | Form |
| --- | --- |
| A static UI state: label, layout, badge, empty or error state, a page that now exists | `screenshot` (PNG, 1280x800) |
| An interaction or flow: several steps, async feedback (toast, loading, redirect), anything where the order of events matters, cross-product connect / deploy | `video` (mp4) |
| Backend only (GraphQL, REST, job, migration) with no screen | `screenshot` of a terminal card: the real request and response, or the real SQL result, rendered in the page |
| Nothing observable (pure refactor, docs, CI, types) | `none`: say so and why; a screenshot of passing tests is not a demo |

When a backend-only change is a multi-step flow, use `video` with terminal cards between steps.

## 2. Bring up the dependencies with podman

Containers run in podman, never Docker. Do each check; start only what is down; never kill or restart something that
is already serving.

1. `podman ps` fails ("Cannot connect to Podman") → `podman machine start`, then retry.
2. Hub infrastructure, from `HUB_TREE`: `podman compose -f xtm-hub-dev/docker-compose.yml up -d` (PostgreSQL on 5434,
   Elasticsearch, Silo, Mailpit). Already-created containers can simply be `podman start`ed.
3. Ports: `lsof -nP -iTCP:3002 -iTCP:4002 -sTCP:LISTEN`. If something listens, it is probably the user's own Hub
   stack, started from another tree, so it does not run this change: ask the user to stop it, never kill it.
4. **Prepare `HUB_TREE` first** (a fresh worktree has neither; both steps are authorized by the user, always do them):
   - `node_modules`: if `HUB_TREE` has none, clone them from `MAIN_CHECKOUT` (instant copy-on-write on APFS, read-only on
     the main checkout), from the worktree root: `for p in node_modules apps/backend/node_modules
     apps/frontend/node_modules apps/e2e/node_modules .yarn/install-state.gz; do [ -e "<MAIN_CHECKOUT>/$p" ] &&
     [ ! -e "$p" ] && mkdir -p "$(dirname "$p")" && { cp -cR "<MAIN_CHECKOUT>/$p" "$p" 2>/dev/null || cp -R
     "<MAIN_CHECKOUT>/$p" "$p"; }; done`. Never run `yarn install` for the demo.
   - Local backend config: the worktree lacks the gitignored `apps/backend/config/local.json`, and the backend dies on
     `Configuration property "session.name" is not defined`. Copy it without reading it:
     `cp <MAIN_CHECKOUT>/apps/backend/config/local.json <HUB_TREE>/apps/backend/config/local.json` (gitignored, so the
     tree stays clean). Delete the copy in step 4 (leave the tree clean).
   Hub backend in **e2e mode** from `HUB_TREE` (background): `yarn workspace @xtm-hub/backend start-dev-e2e-test`.
   The e2e fixtures reset `test_database` (port 5434) before every test, so the demo uses that database and never the
   user's development data. If the ticket adds a migration, the fixtures apply it themselves (`migrate.latest`).
   Hub frontend (background): `yarn dev:front`. Wait until `:4002` and `:3002` answer (poll with `curl`, do not
   sleep blindly).
5. If `PRODUCTS` includes a platform, start it **after** Hub is up: the platform checks Hub reachability once, at
   startup, and a platform started earlier shows a disabled "Connect to XTM Hub" button (restart it if that happens).
   The platform must point at the local Hub, not at a staging one: set it through environment variables, never by
   editing a tracked config file.
   - **OpenAEV** (its checkout is the session folder or the path the user gave, never a guessed
     location; JDK 21: use the `JAVA_HOME` of the machine, e.g. `/usr/libexec/java_home -v 21` on macOS):
     `podman compose up -d openaev-dev-pgsql openaev-dev-minio openaev-dev-elasticsearch openaev-dev-rabbitmq` in
     `openaev-dev`; first time or after backend changes `mvn -DskipTests install -pl openaev-api -am`; then
     `OPENAEV_ENABLED_DEV_FEATURES=<FLAG> mvn -o spring-boot:run -pl openaev-api -Dspring-boot.run.profiles=dev`
     (the flag only when the ticket is behind one); front: `yarn start` in `openaev-front` (3001). Its dev profile
     already targets `http://localhost:3002` for Hub.
   - **OpenCTI** (its checkout is the session folder or the path the user gave): infrastructure with
     `podman compose up -d` in `opencti-platform/opencti-dev`. Read `opencti-platform/opencti-dev/README.md` and
     `.github/copilot-instructions.md` for the current backend and frontend start commands instead of guessing them.
     Its `development.json` points at a staging Hub, so override at launch: `XTM__XTMHUB_URL=http://localhost:3002`
     and `XTM__XTMHUB_API_OVERRIDE_URL=http://localhost:3002`.
   Wait for the platform's health endpoint before going on.
6. A migration run by hand, or any change to a database the user also uses from the main checkout, needs the user's
   yes first, and an offer to roll it back afterwards.

Keep every process you start (id and log file) so step 5 below can stop exactly those and nothing else.

## 3. Record

Use the existing setup: `apps/e2e/playwright.demo.config.ts` (`yarn test:e2e:demo <spec>`: headed Chromium, 1280x800,
`slowMo: 500`, video always on) and the helpers in `apps/e2e/tests/tests_files/demo/demo-caption.util.ts`
(`announceIntro`, `announceStep`, `announceCheckpoint`; the banner sits at the top, so when the UI under test is
there, set an equivalent banner at the bottom). Read one recent spec under `apps/e2e/tests/` and the page models in
`tests/model/` first and reuse them: login, navigation, seeding through `tests/db-utils/`.

1. Write the demo as a Playwright spec in `<HUB_TREE>/apps/e2e/tests/tests_files/demo/<ID>.demo.spec.ts`. It imports
   `test`/`expect` from `../../fixtures/baseFixtures` so the database is reset and seeded like in the e2e suite, and
   follows the scenario step by step with real `expect` assertions: a demo that cannot assert its own steps proves
   nothing. Show the result of the change, not setup noise. The fixtures drop and recreate the schema before every
   test and the seeds create no documents, so the spec must insert the resources it shows itself, with `db` from
   `../../db-utils/db-connection` (look the service instance up by slug, e.g. `opencti-custom-dashboards`; a document
   needs `type`, `slug`, `name`, `status: 'published'`, a `service_instance_id` and an `uploader_id`).
2. Cross-product: add `test.use({ bypassCSP: true })` (the platforms' CSP blocks the Hub reachability check
   otherwise) and set `OPENCTI_URL` / `OPENAEV_URL` for the run; admin credentials come from the platform's page
   model defaults (`tests/model/platforms/xtm-platform.pageModel.ts`) or the platform's own dev config, passed as
   `OPENCTI_ADMIN_EMAIL` / `OPENAEV_ADMIN_EMAIL` and the matching password variables. They are the local dev
   credentials of an app running on this machine; never print them, never put them in a caption or frame.
3. Run from `<HUB_TREE>/apps/e2e`: `yarn test:e2e:demo tests/tests_files/demo/<ID>.demo.spec.ts`.
   - Playwright's own Chromium may be missing (`Executable doesn't exist ... yarn playwright install`). Do not
     download it: use the installed Google Chrome through a temporary config next to the demo one
     (`playwright.demo.tmp.config.ts`: spread `./playwright.demo.config`, same `setup` / `teardown` projects, and the
     `chromium` project with `use: { ...devices['Desktop Chrome'], channel: 'chrome' }`), run it with
     `yarn playwright test --config=playwright.demo.tmp.config.ts <spec>`, and delete it in step 4.
   - `screenshot`: the spec calls `page.screenshot({ path: '<out>/<ID>-<slug>.png' })` at the checkpoint(s). Do not
     use `toHaveScreenshot` (it would write baselines into the repository). The app content scrolls inside its own
     container, so `fullPage` and element screenshots cut off cards or get covered by the sticky header: set a tall
     viewport (`page.setViewportSize({ width: 1280, height: 2400 })`) so nothing scrolls, then clip the target with
     `page.screenshot({ clip })` from its `getBoundingClientRect()` plus a margin.
   - `video`: take `video.webm` from `test-results/`, then
     `ffmpeg -i in.webm -c:v libx264 -pix_fmt yuv420p -crf 28 -an -movflags +faststart <out>/<ID>-<slug>.mp4`.
     Keep it under 10 MB (GitHub's attachment limit on free plans): raise `-crf` or trim the idle start if needed.
     Aim for under a minute.
4. Failure is a finding. If the scenario fails because the change does not do what the ticket says, **do not fake or
   edit around it**: stop and return the failing step and evidence to the caller as a bug. A flaky or environmental
   failure (service not up, port taken) is fixed in the setup and re-run.
5. Check the output yourself with Read: open the PNG; for a video extract frames
   (`ffmpeg -i x.mp4 -vf fps=1/4 frame-%02d.png`) and view at least the first, a middle one and the last. Confirm the
   acceptance criteria are visible, nothing is cut off, and no real personal data (emails, tokens, customer names)
   shows. Re-record if not.

## 4. Leave the tree clean

Copy the demo spec to `<out>/` for reuse, then delete it from `<HUB_TREE>/apps/e2e/tests/tests_files/demo/` and any
`test-results/` it produced inside the tree, plus the temporary Playwright config and the `local.json` copy from
step 2. Running the stack also leaves noise in the tree: the Next dev server writes untracked
`apps/frontend/AGENTS.md` and `apps/frontend/CLAUDE.md`, and the backend regenerates `apps/frontend/schema.graphql`
and `apps/frontend/graphql/generated.ts`. Remove the two untracked files and `git checkout --` the two generated
ones (the run produced those changes, not the caller; check the diff is only generation noise). `git -C <HUB_TREE>
status --short` must be empty, because the caller gates on that. Never `git add` anything from this skill.

## 5. Stop what you started

Stop only the processes and containers this run started (the ones you recorded). Leave podman containers that were
already running, and the podman machine, as they were. Mention what is still up.

## 6. Return

Give the caller: the absolute path of each file, its size, the form chosen and why, a one-line caption for the PR
description, the `PRODUCTS` that were run, and anything that could not be shown. Do not paste media into the chat and
do not upload it anywhere: the user attaches it to the PR description themselves (drag and drop into the
description editor).
