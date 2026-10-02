---
name: elasticsearch-migration
description: Shared XTM Hub conventions for writing and running Elasticsearch migrations in the backend.
---

# Elasticsearch Migration

Shared conventions for migrations in `apps/backend/src/es-migrations/`. Match
your approach to what the change actually needs — don't force a mapping update
onto a data-only change.

## Scaffolding & Running
- From `apps/backend/`: `yarn esmigrate:make <name>`, then rename the generated `.js` to `.ts`.
- Run with `yarn esmigrate:up` / `yarn esmigrate:down`.
- Import the client from `thirdparty/elasticsearch/client.js` (adjust the
  relative path to the file's depth), keeping the `.js` extension even in a
  `.ts` file. Call `next()` at the end of `up`/`down`. Use `logApp`, never `console.log`.

## Isolation
- Don't import application source code (services, resolvers, `db()` from
  `knexfile.ts`, etc.) into a migration — duplicate the small bit of logic you
  need instead. Migrations must keep working even if the app code changes later.
- For Postgres access, don't import `knexfile.ts`'s `db()` wrapper — open a raw
  `knex(baseConfig)` connection instead, as in `1783581050891-import-one-click-deployments.ts`.

## Writing a Migration
- Find the closest existing migration to your change (mapping update, bulk
  document edit, or Postgres backfill are the common shapes) and mirror its
  structure rather than inventing a new one.
- For mapping changes: keep the property list cumulative in a
  `const ... as const` (needed for the `MappingProperty` union), copied from
  the latest existing migration, then add your new field(s) on top. `down`
  can only restore the template — ES can't unmap a field from a live index.
- For bulk document edits or backfills, handle entries individually
  (`try`/`catch` + `logApp.error`) so one bad record doesn't abort the run,
  and make `down` reverse the same operation.
