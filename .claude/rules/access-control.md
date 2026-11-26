---
paths:
  - "apps/backend/**/*.resolver.ts"
  - "apps/backend/**/*.graphql"
  - "apps/backend/src/security/**"
  - "apps/backend/**/*.domain.ts"
  - "apps/backend/tests/helper/test.access-matrix.helper.ts"
  - "apps/backend/tests/helper/test.platform-caller.helper.ts"
  - "apps/backend/**/*.access.test.ts"
---

# Access Control Instructions (`apps/backend`)

**The backend is the only place rights are enforced.** The frontend hides what a user cannot do or see for comfort
only: any user can call the API directly. Every right therefore exists twice, in two layers:

1. **Who may call an operation**: declared on the operation, see below.
2. **Which data the caller may see or change**: a row filter in `src/security/restriction/`, see
   [Filtering data](#filtering-data). A guard that lets a user in says nothing about the rows they get back.

A new feature that gates something in the UI is not done until the backend refuses it too, with a test.

Every GraphQL operation declares who may call it with a decorator or, until its module is migrated, a directive. Two
mechanisms coexist while modules migrate:

| Mechanism | Where | Used by |
| --- | --- | --- |
| `@Public()` / `@Guarded(guard)` on the resolver | `src/security/guarded/` | Migrated modules (`solution-category`, `telemetry`, `manage-product-version`, `subscription`, `news-feed`, `user-service`, `user-service-capability`, `api-token`, `saas-manager-instance`) |
| `@auth`, `@service_capa`, `@system_token`, `@platform_token` in the `.graphql` file | `src/security/directive-graphql/` | Every other module. A field with no directive is public there |

**An operation has a directive or a decorator, never both.** Migrating an operation removes its directive in the same
pull request.

## Declaring access

Resolvers of a migrated operation are typed static properties of a class, because decorators only apply to class
members. Write one class per root type and spread it into the module's resolver map, so each operation is named once.

```ts
class SolutionCategoryQueries {
  @Public()
  static readonly solutionCategories: NonNullable<QueryResolvers['solutionCategories']> = (_, opts) =>
    solutionCategoryDomain.loadSolutionCategories(opts);
}

class SolutionCategoryMutations {
  @Guarded(bypassOnlyGuard())
  static readonly addSolutionCategory: NonNullable<MutationResolvers['addSolutionCategory']> = (_, { input }) =>
    solutionCategoryDomain.insertSolutionCategory(input);
}

const resolvers: Resolvers = {
  SolutionCategoryId: createRelayIdScalar<SolutionCategoryId>('SolutionCategory'),
  Query: { ...SolutionCategoryQueries },
  Mutation: { ...SolutionCategoryMutations },
};
export default resolvers;
```

- Scalars, field resolvers and operations not migrated yet stay in the map, next to the spread.
- Members must be `static` fields: the spread copies a class's own static fields, not instance members or getters.
- Type each property as `NonNullable<QueryResolvers['x']>` / `MutationResolvers['x']`, or its parameters are untyped.
- The decorator runs the guard before the resolver, so a direct call of the resolver is guarded too: a test that
  calls it directly passes a context whose user passes the guard.
- A guard receives the caller (`Principal`, built from the context), never the session, and the arguments of the
  operation. It must not assume a full `PortalContext`: the SSE context is only `{ user, req }`.
- A namespace type (a root field returning `{}`, such as `sendTelemetryEvent`) is guarded on its root field only,
  and only while nothing else reaches that type (field, union or interface). Each one needs its own reachability
  test, as in `telemetry.access.test.ts`.

## Guards

| Declaration | Allows | Refuses with |
| --- | --- | --- |
| `@Public()` | Anyone, anonymous included. Nothing is built or loaded | Never |
| `@Guarded(loggedInGuard())` | Any logged-in user. Not a substitute for a capability check | `UNAUTHENTICATED` (anonymous or disabled user) |
| `@Guarded(bypassOnlyGuard())` | A `BYPASS` user only. Use it for admin-only operations rather than listing `BYPASS` | `UNAUTHENTICATED` (anonymous or disabled user), `FORBIDDEN_ACCESS` (not `BYPASS`) |
| `@Guarded(portalCapabilityGuard([PortalCapability.X, …]))` | A user holding one of the portal capabilities; `BYPASS` always. The list cannot be empty | `UNAUTHENTICATED` (anonymous or disabled user), `FORBIDDEN_ACCESS` (capability missing) |
| `@Guarded(systemCallerGuard([PortalCapability.X, …]))` | A machine with a valid `x-xtm-hub-token` holding every listed scope. The list cannot be empty | `UNAUTHENTICATED` (no or invalid token, session ignored), `FORBIDDEN_ACCESS` (scope missing) |
| `@Guarded(orgGuard({ organization: selectedOrganization, capabilities: [OrganizationCapability.X, …] }))` | A member of the selected organization holding one of the capabilities (`ADMINISTRATE_ORGANIZATION` implies them all, `[]` requires the membership only); `BYPASS` always, unless `bypass: false` | `UNAUTHENTICATED` (anonymous or disabled user), `NOT_FOUND` (not a member, or no organization from the source), `MISSING_CAPABILITY_ON_ORGANIZATION` (capability missing) |
| `@Guarded(serviceGuard({ serviceInstance: fromArg('service_instance_id'), capabilities: [ServiceRestriction.X, …] }))` | A user with an access row on the selected organization's subscription to the service instance, holding one of the service capabilities; `BYPASS` always. The list cannot be empty | `UNAUTHENTICATED` (anonymous or disabled user), `NOT_FOUND` (no such service instance, or no access row on it), `MISSING_CAPABILITY_ON_SERVICE` (capability missing) |
| `@Guarded(allOf(sessionCallerGuard(), …))` | A caller who is not authenticated by an API token. Only inside `allOf`: see [Personal API tokens](#personal-api-tokens) | `UNAUTHENTICATED` (anonymous or disabled user), `NOT_ALLOWED_WITH_API_TOKEN` (API token caller) |
| `@Guarded(callerIsGuard({ user: source }))` | The user the source names and nobody else: `BYPASS` does not pass | `UNAUTHENTICATED` (anonymous or disabled user), `NOT_FOUND` (another user, or no user from the source) |
| `@Guarded(platformCallerGuard({ credential: 'registration' \| 'deploymentRequest' }))` | A platform sending valid `xtm-hub-platform-id` and `xtm-hub-platform-token` headers for the required credential: an `Active` registration with a subscribed organization, or a deployment request token in the `Active`, `Pending` or `Provisioning` hub status | `UNAUTHENTICATED` (missing, invalid or unknown credentials, other credential, inactive registration or other hub status, session ignored) |

A guard returns `allow()` or `deny(code)`. An exception from the guard, or anything else it returns, is a denial.
An exception while building the principal (such as a database error) is not: it propagates and the resolver is not
called. Add each new guard to this table.

`orgGuard` checks the caller's membership, not that the data belongs to the organization: keep the row filter in
`src/security/restriction/`. Whether `BYPASS` sees every row depends on the use case: some filters let it through
themselves, others leave it to their caller, so read the filter before calling it.

### Combining guards and checking the ids of the request

Type the arguments with an explicit generic (`orgGuard<MutationXArgs>(…)`), so a wrong key fails `check-ts`.

- **Sources.** `organization` of `orgGuard`, `serviceInstance` of `serviceGuard` and `user` of `callerIsGuard` take
  `fromArg('key')` or an inline function `(caller, args) => id` that returns an id of their own type; `organization`
  also takes `selectedOrganization`. `orgGuard` and `callerIsGuard` also take an `AsyncSource`, such as `fromRecord`
  below. A missing id answers `NOT_FOUND`.
- **`anyOf(guardA, guardB)`** allows when one guard allows. It refuses with `UNAUTHENTICATED`, else the first
  `MISSING_CAPABILITY_*`, else `FORBIDDEN_ACCESS`, else `NOT_FOUND`. The guards must share one principal builder: a user
  guard cannot be combined with a system or platform guard. It throws when it contains a guard it does not support,
  such as `sessionCallerGuard()`.
- **`allOf(guardA, guardB)`** allows when every guard allows. Guards run in written order and the first denial wins, so
  write the one that needs no query first: it spares the queries of the next ones, and the code does not depend on a
  ranking. The result is the last guard's, which `.targets()` reads: write the `orgGuard` or `serviceGuard` last. Same
  principal builder rule as `anyOf`.
- **`orgGuard({ …, bypass: false })`** treats a `BYPASS` user as any member: use it when the operation acts as a member
  of the organization, whatever the platform rights (a platform admin who is not a member gets `NOT_FOUND`).
- **Sources of a record.** A source reads the id from the arguments; `fromRecord(load)` reads it from a record the
  arguments name: `const tokenOfId = fromRecord(loadTokenOfArgs)`, then
  `tokenOfId.pick(({ organization_id }) => organization_id)` is an `AsyncSource`. The record is loaded once per call of
  the operation, whatever the number of guards that read it. The loader returns `undefined` for an id it cannot use (a
  malformed uuid), which the guards answer with `NOT_FOUND`: it never lets a database error through.
- **`.targets(belongTo(table, args => ids, { serviceInstance? }))`** on `orgGuard`, `serviceGuard`, `anyOf` or `allOf`
  checks that every id the arguments name belongs to what the guard checked: the organization, or the service instance
  and the organization; anything for `BYPASS`. One missing, foreign or malformed id refuses the whole request with
  `NOT_FOUND`; an empty list is allowed. `serviceInstance` says where the request names the service instance, so the ids must be on
  it. Use it whenever a guard checks an organization or a service from one argument and the operation acts on other ids.
  A guard that can answer through a `callerIsGuard` (an `anyOf` that contains one, or an `allOf` that ends with it) takes
  no `.targets()`: `callerIsGuard` allows without what it checked, so the check refuses as soon as the request names an
  id.
- Add an entry to the ownership map (`src/security/guarded/ownership.domain.ts`) before using `belongTo` on a table.

## Filtering data

A guard decides whether a caller may run an operation. It does not decide which rows the operation returns: a
`loggedInGuard()` query that selects `Document.*` hands every document, drafts included, to every logged-in user.
**Every query, count, facet, search, export, dataloader, subscription payload and "by id" lookup that reads protected
data filters the rows to what the caller may see, in the query itself.** Never fetch everything and filter in the
resolver or in the frontend, and never trust an id the client sends: a user who guesses or reuses an id must get the
same `NOT_FOUND` as for a row that does not exist.

- The filter is a reusable function in `src/security/restriction/` (`restrictDocumentToPublished`,
  `restrictDocumentToAccessibleServiceInstance`, …), applied with `.tap(...)` on the Knex query. Reuse the existing
  one instead of rewriting its `where` inline, and write a new one there when none fits.
- The caller comes from `requestContext`, never from an argument the client sends.
- A filter that depends on a capability has two halves: the SQL restriction, and the check that decides whether to
  apply it. `isUserRestrictedToPublishedDocument` (`src/modules/document/document.security.ts`) is the example: a document
  is `draft`, `in_validation` or `published`, and on a manageable service (`MANAGEABLE_SERVICE_DEFINITION_IDENTIFIERS`)
  a user without the `UPLOAD` capability on the service instance only gets `published` ones (platform admins see
  everything). Keep that decision in a `<name>.security.ts` helper, next to the module, not in the resolver.
- Every path that reaches the same data applies the same filter. When a listing is restricted, check the by-id load,
  the count, the facets, the search, the children / related rows and the export: one unfiltered sibling leaks what the
  others hide. Search for the other readers of the table before declaring the filter done.
- The same goes for writes: a caller who may not see a row may not update, delete or change its status either. Filter
  the row (or check it) before the write, not after.
- `BYPASS` sees every row only if the filter says so: read it first (see `orgGuard` above).

## Machine callers

`systemCallerGuard(scopes)` is for an operation only a machine calls, with the `x-xtm-hub-token` header, such as
`newProductVersion` or `upsertSaasManagerInstances`.

- Only an operation guarded by `systemCallerGuard` reads the header, and it is judged on the token alone, never on the
  session: a valid token is a system caller, a missing, empty or invalid one is anonymous. The other guards and
  `@Public()` ignore the header.
- Until scoped tokens, the system caller holds exactly the declared scopes, and so does the user the resolver gets
  (`context.user`, `requireUser()`).

`platformCallerGuard({ credential })` is for an operation only a platform calls, with its platform headers, such as
`consumeProvisionedNewsFeedItems`. The credential is required, with no default.

- `registration`: a registered platform. The registration must be `Active` and have a subscribed organization.
- `deploymentRequest`: a platform being deployed. The deployment request must be in a hub status
  `PLATFORM_ACCEPTED_HUB_STATUSES` lists (`src/security/platform-credential.ts`).
- A caller with the other credential, or whose status is not accepted, is anonymous: `UNAUTHENTICATED`, and the
  resolver is not called. A call without headers is just unauthenticated and logs nothing.
- The resolver gets a platform `context.user` bound to the matched organization. It reads the caller with
  `requirePlatformCaller(context, credential)`, which returns the principal narrowed to that credential.
- The credential lookup is not scoped by tenant: never use `platformCaller` to pick tenant data.

```ts
@Guarded(platformCallerGuard({ credential: 'registration' }))
static readonly consumeProvisionedNewsFeedItems: NonNullable<MutationResolvers['consumeProvisionedNewsFeedItems']> =
  (_, __, context) => {
    const { registration } = requirePlatformCaller(context, 'registration');
    return NewsFeedApp.consumeProvisionedNewsFeedItems({ registration });
  };
```

## Personal API tokens

A request with `Authorization: Bearer xhp_…` runs as the token's user, narrowed by `narrowUserToToken`
(`src/modules/api-token/api-token.auth.ts`) to the token's organization and scope. The database still knows every
organization and right of that user, so anything that reads them again must apply the token:

- `requestContext.get()?.apiToken` holds what the token reaches. It is set for a token request only, and kept apart
  from `context.user`, which a resolver may replace.
- Check the caller's membership or capabilities on an organization the client names with `securityGuard` or
  `AuthHelper`, which apply `ApiTokenReach` (`src/security/api-token-reach.ts`), never with
  `UserOrganizationDomain.loadUserOrganization` directly: a token of organization A would pass for organization B.
- The token user's own organizations, portal capabilities and roles are filtered in the query by
  `src/security/restriction/api-token.ts`. Reading them for another user, or for an invariant check, is unchanged.
- A guard reads the token from the principal: `apiToken?: { id, scope }`, built from `requestContext.get()?.apiToken`,
  which the request middleware sets when an API token authenticated the request; the restrictions and `securityGuard`
  read the same value. The principal's user is `context.user`, already narrowed to the token's organization, so
  `orgGuard` and `serviceGuard` are token-safe as they are: the token's memberships hold its organization only, and
  only an `admin` token keeps organization capabilities.
- A mutation that acts on the account itself (session, credentials, profile, personal space) is declared
  `@Guarded(allOf(sessionCallerGuard(), …))`, with `sessionCallerGuard()` first. `anyOf` throws when it is built with
  it, directly or through an `allOf`. A module not migrated yet lists its
  mutation in `API_TOKEN_DENIED_FIELDS`
  (`src/modules/api-token/api-token.plugin.ts`) instead, and never in both: the plugin refuses it before any
  resolver runs.
- A read token is refused any mutation before the guard runs (`READ_ONLY_API_TOKEN`).
- An expired, revoked or disabled-user token is answered 401 by the middleware: it never reaches GraphQL.

## Errors

A guard denies with a `DenialCode` (`src/security/guarded/guard.types.ts`). The decorator builds the error with
`mapToGraphQLError` (`src/utils/error/error.mapping.ts`), like any other GraphQL error: the code is the `message`, so
the frontend shows `Error.Server.<code>`.

**A changed code is a frontend change.** When a migrated operation answers a different code or message than before,
add the `Error.Server.<code>` key to `apps/frontend/messages/{en,fr,ja}.json` in the same pull request, and say in the
pull request description if the change is in *who* can call it.

## Testing

Test every guarded operation with the access matrix, which runs it through the real schema and `formatError`:

```ts
describe('addSolutionCategory mutation', () => {
  TestHelper.expectAccessMatrix({
    operation: `mutation ($input: AddSolutionCategoryInput!) { addSolutionCategory(input: $input) { name } }`,
    guarded: () => vi.spyOn(solutionCategoryDomain, 'insertSolutionCategory'),
    expected: {
      anonymous: UnauthenticatedErrorCode.Unauthenticated,
      user: ForbiddenErrorCode.ForbiddenAccess,
      admin: 'allowed',
    },
    prepare: async () => ({ variables, expectedData, cleanup }),
  });
});
```

Rows are `anonymous`, `user` (a member with no portal capability) and `admin` (a platform admin). An operation behind
`orgGuard` also lists `memberWithoutCapability`, `otherOrganization` and `nonMember`; one behind a `serviceGuard` adds
`serviceManager`, `serviceMember` and `serviceStranger` (organization members without organization capability, whose
access to the service the fixture grants through `TestHelper.serviceRowUserIds`); one a system caller calls lists
`system` and `invalidSystemToken`; one a platform calls lists `platform`, `invalidPlatformToken` and `unknownPlatform`
(the fixture returns the `platformCredentials` of a registered platform, from `TestHelper.platformCaller.create()`);
one a token may call lists the token rows: `tokenRead`, `tokenReadWrite` and `tokenAdmin` (tokens of an organization
administrator of SECOND ORGA, one per scope), `tokenOtherOrganization` (a `read_write` token of a member of Filigran),
and, behind a `serviceGuard`, `tokenServiceManager` and `tokenServiceMember` (`read_write` tokens of the users of the
`serviceManager` and `serviceMember` rows). A token row creates its token and runs it through the real middleware, so the
plugin, the principal and the restrictions all see it. A mutation answers a `read` token `READ_ONLY_API_TOKEN` whatever
its guard says.
`guarded` returns a spy on the function behind the operation: refused rows assert it was not called, allowed rows that
it was called once and answered `expectedData`, or `expectedDataByRow[row]` for a row that sees different data. Wrap
the call in a `describe` with a literal name, and use `TestHelper`, never the helper file directly.

The matrix proves who may call the operation. **A filter has its own test**: seed one row the caller must not see (a
`draft` document for a user without `UPLOAD`) next to one they may see, call the operation and every sibling path
(list, by-id, count, search) as that user, and assert the hidden row is absent everywhere, then that a user with the
capability gets both. A test that only seeds visible rows passes with the filter removed: remove it and rerun, the
test must fail.

## Adding or migrating an entry point

1. New module: `yarn workspace @xtm-hub/backend generate:module`. It generates a `<Name>Queries` class with one
   admin-only guarded query, its `type Query` field and an `expectAccessMatrix` call. Widen the guard on purpose.
2. Existing operation: declare the rule its directive checks today with a guard, remove the directive, add the matrix.
3. An operation open to anyone is written `@Public()`, never left bare.
4. An operation that returns or changes rows: name the rule that restricts them, apply the restriction from
   `src/security/restriction/`, and test a row the caller must not see.

Decorators need no compiler option (`experimentalDecorators` stays off). Vitest and the production bundle lower them
with esbuild: see the comments in `apps/backend/vitest.config.ts` and `apps/backend/builder/prod/prod.js`.
