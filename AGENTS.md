# AGENTS.md

Entry point for coding agents working in the XTM Hub repository.

XTM Hub is the unified entry point for Filigran's ecosystem — a marketplace for cybersecurity resources, a
knowledge-sharing platform, and a community engagement hub. It is a full-stack TypeScript monorepo on Yarn
workspaces.

| Workspace | Path | Stack | Dev port |
| --- | --- | --- | --- |
| `@xtm-hub/backend` | `apps/backend` | Express 5, Apollo Server, GraphQL, Knex, PostgreSQL, Elasticsearch, Silo (S3) | 4002 |
| `@xtm-hub/frontend` | `apps/frontend` | Next.js 16 (App Router + Turbopack), React 19, `@tanstack/react-query` (mandatory for new data fetching) + Relay (existing pages, being phased out), TailwindCSS 4, `@filigran/ui` | 3002 |
| `@xtm-hub/test_e2e` | `apps/e2e` | Playwright | — |

## Setup

```bash
corepack enable   # REQUIRED — the global yarn 1.x will not work
yarn install      # from the repo root; installs every workspace
```

`corepack enable` must run before **any** yarn command. Node comes from `.nvmrc`, Yarn from the `packageManager`
field in the root `package.json`.

`.yarnrc.yml` sets `nodeLinker: node-modules`, `enableScripts: false` (no postinstall scripts) and
`npmMinimalAgeGate: 4320`, which rejects packages published in the last three days. Shared dependency versions are
pinned in the `catalog` block and referenced as `"catalog:"` — add new shared dependencies there rather than pinning
per workspace.

## Development

```bash
docker compose -f xtm-hub-dev/docker-compose.yml up   # PostgreSQL, Silo (S3), Elasticsearch, Kibana, PgAdmin, Mailpit
yarn dev:api                                          # backend on :4002
yarn dev:front                                        # frontend on :3002 (start the API first)
```

## Validation

Run the narrowest command that covers your change, from the workspace you touched:

```bash
yarn workspace @xtm-hub/backend  test:ci   # check-ts + lint + tests
yarn workspace @xtm-hub/frontend test:ci   # lint + tests
```

Backend tests need PostgreSQL and Silo (S3) running, target `test_database` via `VITEST_MODE=true`, and execute with
`fileParallelism: false`. E2E tests need the frontend and backend already running.

Only run linters, builds and tests that already exist; do not add new tooling unless the task requires it.

The pre-commit hook runs `yarn lint-staged --config .lintstagedrc.cjs` once from the root; it dispatches ESLint and
Prettier to whichever workspaces the staged files belong to.

## Critical rules

Follow [`.github/skills/coding-conventions/SKILL.md`](.github/skills/coding-conventions/SKILL.md) for the mandatory
coding rules (no `console.log`, `_`-prefix unused variables, strict typing, no `as never`/unjustified casts). This
file adds only what that skill doesn't cover:

- **No `console.log`** in new application code. Backend: use `logApp` from
  `apps/backend/src/utils/app-logger.util.ts`; `console.warn`/`console.error` are allowed only in scripts and launch
  code outside the running app. Frontend: ESLint enforces this too, with one existing intentional exception (dev-only
  GraphQL operation tracing, gated and lint-disabled per call site) documented in
  [`frontend.instructions.md`](.github/instructions/frontend.instructions.md#logging) — don't remove it or copy the
  pattern outside that guard without being asked.
- **Never edit generated output**: `apps/frontend/__generated__/`, `apps/frontend/schema.graphql`,
  `apps/backend/src/__generated__/`, `apps/backend/src/model/kanel/`.
- **Never hardcode versions in documentation** — reference `.nvmrc`, `packageManager`, or the `catalog` block in
  `.yarnrc.yml`.
- **Use `@filigran/ui` first** for any frontend UI work; fall back to Tailwind or shadcn primitives only when it has
  no equivalent.
- **After any GraphQL change**, run `yarn workspace @xtm-hub/backend generate:ts` **and**
  `yarn workspace @xtm-hub/frontend relay`.
- **Before frontend `check-ts` on a fresh checkout**, run `yarn workspace @xtm-hub/frontend next typegen`.
  `next-env.d.ts` is generated and gitignored; without it you get bogus `@public/*.svg` module errors.

## Commits and pull requests

See [`.github/copilot-instructions.md`](.github/copilot-instructions.md#commit-pr--issue-conventions) for the
Conventional Commits format, types, and labeling taxonomy. That section is synced from an org-wide source (also
mirrored in [`CONTRIBUTING.md`](CONTRIBUTING.md)), so it stays there rather than here to avoid drifting out of sync.

## Detailed instructions

This file is the canonical, cross-tool reference for repo-wide context (stack, setup, validation, critical rules).
Copilot-specific and area-scoped guidance layers on top of it:

- [`.github/copilot-instructions.md`](.github/copilot-instructions.md) — shared repository context
- [`.github/instructions/`](.github/instructions/) — per-area rules applied by path
  (`backend`, `frontend`, `e2e`, `graphql`, `migrations`, `testing`, `ci`)
- [`.github/skills/`](.github/skills/) — task-specific playbooks
- [`.github/agents/`](.github/agents/) — specialised agent definitions

Read the file matching the area you are touching before making changes. To review AI instructions/docs/agents/skills
for drift, use the `hub-review` skill (`.github/skills/hub-review/SKILL.md`) rather than guessing.
