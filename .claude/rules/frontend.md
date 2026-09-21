---
applyTo: 'apps/frontend/**'
paths:
  - "apps/frontend/**"
---

# Frontend Instructions (`apps/frontend`)

Next.js 16 (App Router + Turbopack) + React 19 + TailwindCSS 4 + `@filigran/ui`. Dev port **3002** (Docker production
serves on 3000 internally).

Two data layers coexist mid-migration: **`@tanstack/react-query` is mandatory for all new data-fetching work**
(see [Data fetching](#data-fetching)); **Relay** only remains on existing pages, and the long-term goal is to
remove it entirely — migrate a Relay component to react-query whenever you're already touching it and it's
safe to do so.

## Commands

Run from `apps/frontend` (or `yarn workspace @xtm-hub/frontend <script>`).

| Command | What it does |
| --- | --- |
| `yarn relay` | `relay-compiler` — **required after any GraphQL change** |
| `yarn codegen` | `graphql-codegen --config codegen.ts` |
| `yarn next typegen` | Generates `next-env.d.ts` and route types — **required before `check-ts`** |
| `yarn check-ts` | `tsc --noEmit` |
| `yarn lint` | `eslint .` |
| `yarn format` / `yarn format:check` | Prettier |
| `yarn test` | Vitest + jsdom |
| `yarn test:ci` | `lint` + tests with coverage — the full gate |
| `yarn build` | `relay-compiler && next build` |
| `yarn i18n:check` | Locale parity against `messages/en.json` |
| `yarn generate:component` | Scaffolds a component |

`yarn dev` runs `relay-compiler`, `codegen:watch` and `next dev` concurrently, so artifacts stay fresh while you work.
Outside `dev`, run `yarn relay` yourself after touching any `graphql` tagged template — stale artifacts surface as
confusing type errors in `__generated__/`.

**`next-env.d.ts` is gitignored and generated.** It is what declares `@public/*.svg` and the route types, so on a
fresh checkout `yarn check-ts` reports around twenty bogus `Cannot find module '@public/….svg'` errors. Run
`yarn next typegen` first — do not "fix" those errors by adding declarations.

## Layout

```
app/                                Next.js App Router
  (application)/app/(admin)/admin/  Admin panel
  (application)/app/(user)/         Service pages, org management, profile
  (public)/                         Public marketing routes
  (authentification)/auth/          Auth callbacks
  (embed)/                          Embeddable widgets
src/components/                     Components by domain; `ui/` holds shared primitives
src/hooks/                          useGranted, useDecodedParams, ...
src/relay/                          Client + server environments, SSR provider (existing pages)
src/lib/graphql-client.ts           portalGraphqlClient — graphql-request client for react-query
src/i18n/                           next-intl config, locale, request scope
src/lib/  src/utils/                Helpers, server actions, middleware helpers, query-cache
graphql/                            *.query.graphql / *.mutation.graphql + generated.ts (react-query, new work)
__generated__/                      Relay output — generated, never edit
messages/                           One JSON file per locale (`en` is the source — see `yarn i18n:check`)
proxy.ts                            Next.js 16 proxy convention (was middleware.ts); i18n + auth/document/GraphQL proxying
schema.graphql                      Written by the backend, read by Relay
```

## Path aliases

- `@/*` → `./src/*`
- `@generated/*` → `./__generated__/*` (Relay artifacts)
- `@graphql/*` → `./graphql/*` (react-query operations and codegen output)

Use them instead of deep relative paths.

## UI components

`@filigran/ui` is Filigran's in-house component library and matches our design system. **Always reach for it first**
for buttons, inputs, tables, dialogs and the like. Fall back to raw TailwindCSS or shadcn/ui primitives only when
`@filigran/ui` genuinely has no equivalent.

- Icons: `@filigran/icon`
- Styling: TailwindCSS 4 with `FiligranUIPlugin` (see `tailwind.config.ts`)
- Forms: `react-hook-form` + `zod` (v4)
- Markdown: `@uiw/react-md-editor`

## Data fetching

The backend is reached through `proxy.ts` (Next.js 16's convention file, renamed from `middleware.ts`), which
delegates GraphQL/auth/document routes to `src/utils/middleware/graphql-request.util.ts` and rewrites them to
`SERVER_HTTP_API` (default `http://localhost:4002`).

**For new work, use `@tanstack/react-query`**, not Relay. See
[`graphql.md`](graphql.md#tanstackreact-query-conventions-new-frontend-work) for the
operation-file convention, the codegen command, and the client/cache-invalidation wiring.

**Never introduce new Relay usage, even for a small addition to an existing Relay page** — add it as a
react-query call instead. The long-term goal is to remove Relay from this codebase entirely, so every
new query or mutation should be react-query by default.

When a task touches a component that still uses Relay for an unrelated reason, migrate that component's
data fetching to react-query as part of the change, unless the migration is clearly out of scope for the
task or too risky to fit safely (complex pagination/streaming, a large blast radius) — if you skip the
migration for that reason, say so explicitly rather than silently leaving Relay in place. After removing
a component's last Relay usage, confirm nothing else still imports its generated artifacts before
deleting them.

Existing Relay pages: see
[`graphql.md`](graphql.md#relay-conventions-existing-pages-only) for the file convention
and regeneration command.

Server-side fetches go through `src/relay/server-portal-api-fetch.ts`, which forwards Next.js cookies.

## Logging

`console.log` is not acceptable in new application code (ESLint enforces `no-console` repo-wide, `warn`/`error`
excepted). The one existing exception is intentional dev-only GraphQL operation tracing — `src/lib/graphql-client.ts`,
`src/lib/server-graphql-fetch.ts`, and `src/relay/environment/fetch-fn.ts` each log the operation name and variables
behind an `isDevelopment()` guard with an explicit `// eslint-disable-next-line no-console`. Do not remove these
without being asked, and do not add a new one outside that same guarded, narrowly-scoped pattern.

## Routing & Links

**Disable prefetch on side-effecting links.** Next.js `<Link>` prefetches its `href` in the background as
soon as it enters the viewport (or on hover). Any `href` that resolves to a route with real side effects —
for example paths under `/auth/*`, `/document/*`, `/user/picture`, or an App Router `route.ts` handler that
authenticates, mutates data, or triggers a redirect with business logic (like
`app/redirect/[identifier]/route.ts`) — must use `<Link href="..." prefetch={false}>`. Plain `<a href="...">`
tags are unaffected and don't need this. When adding or reviewing any `<Link>`, check whether its target is
a passive page/RSC route or a side-effecting endpoint before deciding on `prefetch`.

## Internationalisation

All user-facing strings go through `next-intl`. Add the key to every locale file under `messages/` (`en.json` is the
source of truth) — never hardcode copy in a component. `yarn i18n:check` verifies parity.

## Tests

See [`testing.md`](testing.md) for structure, mocking policy and the frontend-specific
tooling (`testRender`, `next-intl` mocking, `@tanstack/react-query` vs Relay mocking, pure-utility extraction).

## Environment variables

`SERVER_HTTP_API` (default `http://localhost:4002`), `E2E_BASE_URL` (default `http://localhost:3002`),
`NEXT_PUBLIC_APP_VERSION`.
