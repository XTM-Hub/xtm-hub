---
applyTo: 'apps/backend/**'
---

# Backend Instructions (`apps/backend`)

Express 5 + Apollo Server + GraphQL + Knex + PostgreSQL + Elasticsearch + Silo (S3). Dev port **4002**.

## Commands

Run from `apps/backend` (or `yarn workspace @xtm-hub/backend <script>`).

| Command | What it does |
| --- | --- |
| `yarn check-ts` | `tsc --noEmit` type check |
| `yarn lint` / `yarn lint:fix` | ESLint (flat config, typescript-eslint strict) |
| `yarn test` | Vitest, sets `VITEST_MODE=true` |
| `yarn test:coverage` | Vitest + V8 coverage |
| `yarn test:ci` | `check-ts` + `lint` + coverage — the full gate |
| `yarn build` | `copy` + esbuild (`builder/prod/prod.js`) |
| `yarn generate:ts` | GraphQL codegen → `src/__generated__/resolvers-types.ts` |
| `yarn generate:module` | Scaffolds a new module |

Prefer the narrowest command that covers your change. Use `yarn test:ci` before opening a pull request.

Tests need PostgreSQL and Silo (S3) running (`docker compose -f xtm-hub-dev/docker-compose.yml up`). Vitest runs with
`fileParallelism: false` and hits a real `test_database` when `VITEST_MODE=true`.

## Layout

```
src/index.ts                 Entry point — Express + Apollo + SSE
src/config.ts                Configuration via node-config
src/crons.ts                 Scheduled jobs (node-cron)
src/portal.const.ts          Platform constants (UUIDs, roles, system user)
src/modules/                 Feature modules
src/security/                Authorization: @auth directive, guards, restrictions
src/context/                 AsyncLocalStorage (request, database transaction)
src/model/kanel/             Types generated from PostgreSQL via kanel
src/nodes/                   Relay-compatible GraphQL Node interface
src/server/                  Apollo plugins, Express endpoints, mail templates
src/thirdparty/              elasticsearch, minio, auth0, hubspot, copilot, pgboss
src/utils/                   Logger, hashing, formatting, feature flags
src/migrations/              Knex migrations (.js)
src/es-migrations/           Elasticsearch migrations
config/                      node-config JSON files
```

Module domains: `organization-management`, `service`, `service-link`, `deployment`, `document`,
`shareable-resource` (`opencti`, `openaev`), `registration`, `security-management`, `settings`, `subscription`,
`user-service`, `role-portal`, `telemetry`, `log`, `use-case`, `xtm-platform-roadmap`.

## Module structure

Each module directory holds `<name>.graphql` (schema), `<name>.resolver.ts` (resolvers) and `<name>.service.ts`
(business logic). Keep resolvers thin — they validate and delegate to the service.

Adding a module:

1. `yarn generate:module`, or copy the shape produced by `src/scripts/generate-new-module.ts`.
2. Define types, queries and mutations in `<name>.graphql`.
3. Implement `<name>.resolver.ts` and `<name>.service.ts`.
4. Register the resolver in `src/server/graphql-schema.ts`.
5. Run `yarn generate:ts`.

## Database access

Knex 3 as a query builder — **not** an ORM. `db()` from `knexfile.ts` is the primary accessor: it takes a
`DatabaseType` (table name), supports `paginate()`, and reads `databaseContext` (AsyncLocalStorage) so it joins the
ambient transaction implicitly. Do not open your own connection.

`knexconfig.ts` holds the base connection; `knexfile.ts` layers on migrations, seeds, security and pagination.

## Configuration

`node-config` reads `config/*.json` (`default`, `development`, `production`, `staging`, `local`). Environment
variables map through `config/custom-environment-variables.json`:
`DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_BASE`, `ADMIN_EMAIL`,
`ADMIN_PASSWORD`, `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET_NAME`,
`MINIO_USE_SSL`, `ELASTIC_HOST`, `ELASTIC_PORT`, `NODE_ENV`, `VITEST_MODE`, `DATA_SEEDING`, `SESSION_STORE_TYPE`,
`BASE_URL_FRONT`.

Never read `process.env` directly in application code — go through `src/config.ts`.

## Authentication & security

- Providers: OIDC (`openid-client`) and local form-based, under `src/modules/security-management/authentication/`.
- Sessions: `express-session`, PostgreSQL or memory store (`src/session-store-manager.ts`).
- GraphQL authorization: the `@auth` directive transformer in `src/security/directive-graphql/`. Put access control
  on the schema, not scattered through resolvers.
- Subscriptions: GraphQL SSE (`graphql-sse`) on `/graphql-sse`, with PubSub in `src/pub.ts`.

## Logging

Use `logApp` from `src/utils/app-logger.util.ts`. `console.log` is never acceptable. `console.warn` and
`console.error` are tolerated only in standalone scripts and launch code that is not part of the running app.

## API collection (Bruno)

`bruno/` at the repo root (`bruno/bruno.json`) is a Bruno collection mirroring the real GraphQL and REST surface, one
folder per module (e.g. `bruno/manifest/`, `bruno/deployment/`, `bruno/solution-category/`). Whenever you add,
rename, or change the shape of a GraphQL operation (query/mutation/subscription) or a REST endpoint
(`src/server/endpoints/`, `*-endpoint.ts` files), add or update the matching `.bru` request(s) so the collection
keeps matching the API instead of going stale. Match the existing shape: `type: graphql` requests carry the exact
query/mutation in `body:graphql` and its variables in `body:graphql:vars`; `type: http` requests use the plain
`get`/`post`/... block. Reuse the variables already defined in `bruno/environments/local.bru` (`{{baseUrl}}`,
`{{cookie}}`, `{{xtm-hub-token}}`) rather than hardcoding a host or secret.

## Tests

See [`testing.instructions.md`](testing.instructions.md) for structure, mocking policy and backend-specific tooling
(`test_database`, `fileParallelism: false`).
