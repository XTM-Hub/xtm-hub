---
paths:
  - "apps/backend/**/*.resolver.ts"
  - "apps/backend/**/*.graphql"
  - "apps/backend/src/security/**"
  - "apps/backend/tests/helper/test.access-matrix.helper.ts"
  - "apps/backend/**/*.access.test.ts"
---

# Access Control Instructions (`apps/backend`)

Every GraphQL operation declares who may call it with one decorator. Two mechanisms coexist while modules migrate:

| Mechanism | Where | Used by |
| --- | --- | --- |
| `@Public()` / `@Guarded(guard)` on the resolver | `src/security/guarded/` | Migrated modules (`solution-category`) |
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
  @Guarded(portalCapabilityGuard([PortalCapability.Bypass]))
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
  calls it directly passes a context whose user holds the capability.
- A guard receives the caller (`Principal`, built from the context), never the session. It must not assume a full
  `PortalContext`: the SSE context is only `{ user, req }`.

## Guards

| Declaration | Allows | Refuses with |
| --- | --- | --- |
| `@Public()` | Anyone, anonymous included. Nothing is built or loaded | Never |
| `@Guarded(portalCapabilityGuard([PortalCapability.X, …]))` | A user holding one of the portal capabilities; `BYPASS` always. The list cannot be empty | `UNAUTHENTICATED` (anonymous or disabled user), `FORBIDDEN_ACCESS` (capability missing) |

A guard returns `allow()` or `deny(code)`. An exception, or anything else, is a denial. Add each new guard to this
table.

## Errors

A refusal's `message` and `extensions.code` are both the code, so the frontend shows `Error.Server.<code>`. Build it
with `buildGuardError` (`src/security/guarded/guard-error.ts`): a plain `new Error('FORBIDDEN_ACCESS')` is masked as
`UNKNOWN_ERROR` by `formatError`.

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
    expected: { anonymous: ErrorType.Unauthenticated, user: ErrorType.ForbiddenAccess, admin: 'allowed' },
    prepare: async () => ({ variables, expectedData, cleanup }),
  });
});
```

Rows are anonymous, a user without the capability and a platform admin. `guarded` returns a spy on the function behind
the operation: refused rows assert it was not called, allowed rows that it was called once. Wrap the call in a
`describe` with a literal name, and use `TestHelper`, never the helper file directly.

## Adding or migrating an entry point

1. New module: `yarn workspace @xtm-hub/backend generate:module`. It generates a `<Name>Queries` class with one
   admin-only guarded query, its `type Query` field and an `expectAccessMatrix` call. Widen the guard on purpose.
2. Existing operation: declare the rule its directive checks today with a guard, remove the directive, add the matrix.
3. An operation open to anyone is written `@Public()`, never left bare.

Decorators need no compiler option (`experimentalDecorators` stays off). Vitest and the production bundle lower them
with esbuild: see the comments in `apps/backend/vitest.config.ts` and `apps/backend/builder/prod/prod.js`.
