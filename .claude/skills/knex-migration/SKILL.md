---
name: knex-migration
description: Shared XTM Hub conventions for writing and running Postgres schema migrations with Knex in the backend.
---

# Knex Migration

Shared conventions for migrations in `apps/backend/src/migrations/`. Match your
approach to what the change actually needs — don't rewrite a whole table when
an `alterTable` will do.

## Scaffolding & Running
- From `apps/backend/`: `yarn migrate:make <name>`, which creates a file in
  `src/migrations/` prefilled with the `up`/`down` scaffold — just fill in the body.
- Migrations are **plain JS, not TypeScript** — Knex's runner doesn't compile TS.
- Run with `yarn migrate:latest` (or `yarn migrate:up` / `yarn migrate:down`).
  The dev API also applies pending migrations on startup.

## After Writing a Migration
- Regenerate Kanel types: `yarn generate-pg-to-ts` (or `npx kanel`, after
  temporarily removing `"type": "module"` from `package.json`). If a column is
  an enum type, add/update its entry in `COLUMN_ENUM_MAP` in `kanel.config.cjs` first.
- If you created a new table, add its `DatabaseType` entry in `knexfile.ts`,
  then update any affected GraphQL schema, resolvers, and models.

## Scope
- Keep Knex migrations Postgres-only. Don't call `esDbClient` or otherwise
  fetch/update Elasticsearch here — these migrations run against Postgres on
  API startup, before Elasticsearch is guaranteed to be up. Elasticsearch
  changes belong in `src/es-migrations/` (see the Elasticsearch Migration skill).

## Writing a Migration
- Find the closest existing migration to your change (new table, altered
  columns, or a data-only fixup are the common shapes) and mirror its structure
  — including id/FK conventions (e.g. `defaultTo(knex.raw('gen_random_uuid()'))`,
  `.references(...).inTable(...)`).
- When creating tables, use singular **PascalCase** names (e.g. `ServiceDefinition`,
  not `serviceDefinitions`); for join/pivot tables, join the two table names with
  an underscore (e.g. `User_Organization`, `Service_Capability`).
- `down` must be the exact inverse of `up` (e.g. `dropTable` for `createTable`,
  revert `.notNullable()` back to `.nullable()` for an added constraint) — never
  leave `down` empty unless the change is genuinely irreversible.
- When altering an existing column with `.alter()`, restate **all** of its
  current properties (type, `nullable`/`notNullable`, `defaultTo`, etc.), not
  just the one you're changing — Knex/Postgres will silently drop any
  unspecified property (e.g. an existing `defaultTo`) instead of preserving it.
