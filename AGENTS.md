# XTM Hub

Filigran's unified entry point: a marketplace for cybersecurity resources, a knowledge-sharing platform and a
community engagement hub. Full-stack TypeScript monorepo on Yarn workspaces.

| Workspace | Path | Stack | Dev port |
| --- | --- | --- | --- |
| `@xtm-hub/backend` | `apps/backend` | Express 5, Apollo Server, GraphQL, Knex, PostgreSQL, Elasticsearch, Silo (S3) | 4002 |
| `@xtm-hub/frontend` | `apps/frontend` | Next.js 16 (App Router + Turbopack), React 19, `@tanstack/react-query` (mandatory for new data fetching) + Relay (existing pages, being phased out), TailwindCSS 4, `@filigran/design-system` | 3002 |
| `@xtm-hub/test_e2e` | `apps/e2e` | Playwright | — |

## Setup

```bash
corepack enable   # REQUIRED before any yarn command; the global yarn 1.x fails
yarn install      # from the repo root, installs every workspace
```

Node comes from `.nvmrc`, Yarn from `packageManager` in the root `package.json`. `.yarnrc.yml` sets
`enableScripts: false` and `npmMinimalAgeGate: 4320` — a package published in the last three days will not install.
Pin shared dependency versions in its `catalog` block and reference them as `"catalog:"`.

## Development

```bash
docker compose -f xtm-hub-dev/docker-compose.yml up   # PostgreSQL, Silo (S3), Elasticsearch, Kibana, PgAdmin, Mailpit
yarn dev:api                                          # backend on :4002
yarn dev:front                                        # frontend on :3002, API first
```

## Validation

Run the narrowest command that covers the change, from the workspace you touched.

```bash
yarn workspace @xtm-hub/backend  test:ci   # check-ts + lint + tests
yarn workspace @xtm-hub/frontend test:ci   # lint + tests
```

Backend tests need PostgreSQL and Silo (S3) running, target `test_database` via `VITEST_MODE=true` and run with
`fileParallelism: false`. E2E tests need the frontend and backend already running. Add no tooling that does not
already exist. The `typescript-eslint` version warning is non-blocking.

## Critical rules

- **No `console.log`** in new application code. Backend: `logApp` from `apps/backend/src/utils/app-logger.util.ts`.
  `console.warn` / `console.error` only in scripts and launch code outside the running app.
- **Never edit generated output**: `apps/frontend/__generated__/`, `apps/frontend/schema.graphql`,
  `apps/backend/src/__generated__/`, `apps/backend/src/model/kanel/`.
- **Never hardcode versions in documentation** — reference `.nvmrc`, `packageManager` or the `catalog` block.
- **Use `@filigran/design-system` first** for frontend UI; the legacy `@filigran/ui` copy only where it has no
  equivalent yet. Details in [`design-system.md`](.claude/rules/design-system.md).
- **After any GraphQL change**, run `yarn workspace @xtm-hub/backend generate:ts` **and**
  `yarn workspace @xtm-hub/frontend relay`.
- **Before frontend `check-ts` on a fresh checkout**, run `yarn workspace @xtm-hub/frontend next typegen`, or you
  get bogus `@public/*.svg` errors from the gitignored `next-env.d.ts`.
- Baseline coding rules: the [`coding-conventions`](.claude/skills/coding-conventions/SKILL.md) skill.

## Detailed instructions by area

The rule files below hold the stack, commands and workflow of each area. Claude Code and Copilot load them on their
own; any other agent does not, so **read the matching file before changing code in that area**. Plain links on
purpose, not `@` includes: those would load every rule in every session.

| You touch | Read first | Agent |
| --- | --- | --- |
| `apps/backend` | [`backend.md`](.claude/rules/backend.md) | `backend-code-writer` |
| `apps/frontend` | [`frontend.md`](.claude/rules/frontend.md), [`design-system.md`](.claude/rules/design-system.md) | `frontend-code-writer` |
| GraphQL schema, resolvers, operations | [`graphql.md`](.claude/rules/graphql.md) | |
| Migrations and seeds | [`migrations.md`](.claude/rules/migrations.md) | `backend-code-writer` |
| Tests | [`testing.md`](.claude/rules/testing.md) | |
| `apps/e2e` | [`e2e.md`](.claude/rules/e2e.md) | |
| Workflows, Docker, Helm chart | [`ci.md`](.claude/rules/ci.md) | |

Agents live in `.claude/agents/`. For implementation work under `apps/backend` or `apps/frontend`, use the matching
agent, or follow its instructions if your tool cannot delegate. Splitting a branch into commits is
`commit-splitter`'s job.

Skills in `.claude/skills/` cover the cross-cutting practice: [`change-delivery`](.claude/skills/change-delivery/SKILL.md)
for scope and how to present a change, [`performance-security-review`](.claude/skills/performance-security-review/SKILL.md)
to self-check new code, and [`code-review`](.claude/skills/code-review/SKILL.md) before opening a pull request.

## Commits and pull requests

`type(scope?)!?: description (#issue)` — [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).
Types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `revert`. The scope is a
lowercase noun; the description starts lowercase and has no trailing period, acronyms preserved. Pull request
titles **must** end with the issue reference and every pull request links to an issue. Sign every commit.

Full title and label taxonomy: [`.github/LABELS.md`](.github/LABELS.md).

## Changing the agent instructions

Before editing anything under `.claude/` or `.github/agents/`, use the `hub-review` skill.
