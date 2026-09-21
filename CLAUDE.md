# CLAUDE.md

Entry point for coding agents working in the XTM Hub repository. `AGENTS.md` is a symlink to this file.

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

## The one data flow to understand

The GraphQL schema is authored in the backend and flows to the frontend: the frontend never edits it. See
[`graphql.instructions.md`](.github/instructions/graphql.instructions.md) for the full flow, the regeneration
commands (`generate:ts`, `relay`), and why skipping them is the most common cause of confusing frontend type errors.

## Critical rules

Follow [`.claude/skills/coding-conventions/SKILL.md`](.claude/skills/coding-conventions/SKILL.md) for the mandatory
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

## Pitfalls

- **Yarn version mismatch** — always `corepack enable` first.
- **Missing Relay artifacts** — run `yarn relay` after any GraphQL change or before a frontend build.
- **Bogus `@public/*.svg` type errors** — `next-env.d.ts` is generated and gitignored. Run
  `yarn workspace @xtm-hub/frontend next typegen` before `check-ts` on a fresh checkout.
- **E2E failures** — the frontend (:3002) and backend (:4002) must already be running.
- **Test database** — backend tests use `test_database`, not `cloud-portal`, when `VITEST_MODE=true`, and Vitest runs
  with `fileParallelism: false`.
- **Frontend ports** — 3002 in development, 3000 inside the production container.
- **TypeScript ESLint version warning** — non-blocking, ignore it.
- **Three-day dependency age gate** — a brand-new package release will fail to install until it ages out.

## Commits and pull requests

See [`.github/copilot-instructions.md`](.github/copilot-instructions.md#commit-pr--issue-conventions) for the
Conventional Commits format, types, and labeling taxonomy. That section is synced from an org-wide source (also
mirrored in [`CONTRIBUTING.md`](CONTRIBUTING.md)), so it stays there rather than here to avoid drifting out of sync.

## Where the rest of the guidance lives

This file is the canonical, cross-tool reference for repo-wide context (stack, setup, validation, critical rules).
Each tool layers its own surface on top:

| | Claude Code | GitHub Copilot |
| --- | --- | --- |
| Entry point | `CLAUDE.md` (this file) | `AGENTS.md` → symlink to this file, plus [`.github/copilot-instructions.md`](.github/copilot-instructions.md) |
| Per-area rules | [`.github/instructions/*.instructions.md`](.github/instructions), imported wholesale at the end of this file | the same files, injected by `applyTo` glob |
| Skills | [`.claude/skills/*/SKILL.md`](.claude/skills) | `.github/skills` → symlink to `.claude/skills` |
| Subagents | [`.claude/agents/*.md`](.claude/agents) | [`.github/agents/*.agent.md`](.github/agents) |
| Shared settings | [`.claude/settings.json`](.claude/settings.json) | — |

Wherever the two tools allow it, both columns resolve to the same file: `AGENTS.md` and `.github/skills` are
symlinks, and the [Area rules](#area-rules) section below `@`-imports the instruction files rather than restating
them. Those files stay under `.github/` because Copilot's `applyTo` mechanism resolves them from there.

The agent definitions are the one genuine duplication — the two tools have different `tools:` vocabularies, so each
needs its own file. Both are deliberately thin and delegate to the same skills and instructions; keep them
behaviourally identical when you change one.

### Path-scoped rules

Claude Code has no `applyTo` equivalent. Rather than approximate it, this file imports **every** instruction file
(see [Area rules](#area-rules)), so the same rules Copilot injects per glob are always in context here. The globs
below are what Copilot matches on; for Claude Code they are just a map of which file covers what.

| Touching… | Covered by |
| --- | --- |
| `apps/backend/**` | [`backend.instructions.md`](.github/instructions/backend.instructions.md) |
| `apps/frontend/**` | [`frontend.instructions.md`](.github/instructions/frontend.instructions.md) |
| `apps/e2e/**` | [`e2e.instructions.md`](.github/instructions/e2e.instructions.md) |
| Schema, resolvers, Relay/react-query operations | [`graphql.instructions.md`](.github/instructions/graphql.instructions.md) |
| `src/migrations/`, `src/es-migrations/`, seeds | [`migrations.instructions.md`](.github/instructions/migrations.instructions.md) |
| `*.test.ts`, `*.test.tsx`, `*.utils.ts` | [`testing.instructions.md`](.github/instructions/testing.instructions.md) |
| Workflows, Docker, Helm | [`ci.instructions.md`](.github/instructions/ci.instructions.md) |

**Start Claude Code from the repository root.** Started from inside `apps/backend/` or any other subdirectory, that
directory becomes the project root, the imports below point outside it, and they silently do not resolve — you get
this file's prose without a single area rule. Nothing warns you. If you must work that way, open the file from the
table above yourself.

Read the file matching the area you are touching before making changes. To review AI instructions/docs/agents/skills
for drift, use the `hub-review` skill ([`.claude/skills/hub-review/SKILL.md`](.claude/skills/hub-review/SKILL.md))
rather than guessing.

## Area rules

Everything below is imported verbatim from `.github/instructions/`, where the files live so Copilot's `applyTo`
globs keep resolving. Edit them there — never copy their content into this file.

Relative links inside the imported content resolve from `.github/instructions/`.

@.github/instructions/backend.instructions.md

@.github/instructions/frontend.instructions.md

@.github/instructions/e2e.instructions.md

@.github/instructions/graphql.instructions.md

@.github/instructions/migrations.instructions.md

@.github/instructions/testing.instructions.md

@.github/instructions/ci.instructions.md
