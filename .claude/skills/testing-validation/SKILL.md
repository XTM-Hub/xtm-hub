---
name: testing-validation
description: Shared XTM Hub expectations for adding tests and validating changes.
---

# Testing and Validation

Shared testing and validation expectations for XTM Hub code changes. Layer- and domain-specific test rules (e.g. backend
integration testing) build on top of these.

## Protecting Existing Tests

- Adding **new** tests (new `it`/`describe` blocks, new files) is always encouraged and never requires asking first.
- Do **not** rewrite, restructure, delete, or change the scenario/assertions of an **existing** test unless either:
    - it fails to compile/run purely because of a change you were asked to make (e.g. renamed import, changed function signature), or
    - its expectations must change to strictly match a business-logic change you were explicitly asked to implement.
- If an existing test looks wrong, outdated, redundant, or in need of restructuring for reasons unrelated to the above,
  stop and ask before touching it — do not silently rewrite it.

## Keeping the Suite Lean

- While working, actively look for tests your change makes redundant, obsolete, or unnecessarily long-winded (e.g. a
  near-duplicate of another case, or a scenario that's now fully covered by a broader `it.each` dataset). Don't just
  leave them or add a new test alongside them.
- Propose the specific consolidation or removal and what it would keep/drop — then follow the ask-first rule above
  before actually touching the existing test.
- Prefer folding a new case into an existing `it.each` dataset over adding a near-duplicate `it` block, when the
  scenarios genuinely share setup and only differ in data.

## Adding Tests

- Add or update tests near the changed files (`*.test.ts` / `*.test.tsx`).
- Use the project's testing helpers and mocking conventions already used in the codebase. Mock the less possible. Don't
  mock children components.
- Favor deterministic tests and avoid brittle implementation-detail assertions.
- Use parametric tests with `it.each` when tests share logic but differ in data sets. Don't use conditions in parametric
  tests (in this case, it's not a parametric test!)
- Use the array form `(it.each([...]))` when a test case value is null or undefined
- Check tests aren't redundant with others.
- Proactively identify edge cases and ensure comprehensive coverage.
- Mandatory test structure: Use Given/When/Then in every test, with one main business assertion per scenario.
- Naming convention: Use should <expected behavior> when <context> to avoid vague test titles.
- No implementation-detail assertions: Test observable behavior (UI output, function result, DB side effect), not
  internal details (user facing)
- Clear mocking policy: Mock only at boundaries (network, clock, UUID, storage); avoid mocking pure business logic. If a
  pure utility function (formatting, mapping, computation) produces the correct result when given proper test data,
  supply that real data instead of mocking the function.
- **Global infrastructure mocks live in `setup-vitest.ts` — never repeat them per test file.** Mocks for `next/image`,
  `next/navigation`, and other framework-level modules are already configured globally. Only add mocks in a test file
  for behavior that is specific to that test (e.g. hooks, service calls, data-fetching).
- **Never use `as never` in test data.** Cast test fixtures to the actual generated type (e.g.
  `as publicDocumentListItemFragment$data`) or, better, provide the required fields directly so no cast is needed at
  all.
- **Extract repeated fixture values to named constants.** Any primitive value (string, number, boolean) that appears in
  both the fixture object and in assertions must be declared as a `const` at the top of the test file and reused
  everywhere. This prevents silent drift between test setup and assertion.
- **Verify new/changed tests actually assert something.** After writing or changing a test for new or changed
  behavior, briefly break the logic it's supposed to protect (comment out the line, invert a condition, remove a
  guard) and rerun that test — it must fail. If it still passes, the assertion is too loose or checking the wrong
  thing; fix the test, then revert the deliberate breakage before finishing.
- Strict determinism: Freeze time, use fixed random seeds, and avoid any dependency on test execution order.
- High-quality it.each datasets: Always include nominal cases, boundary cases, invalid inputs, and known regressions.
- Readable fixtures: Prefer builders/factories (makeUser, makeOrg) over large inline objects.
- Anti-flaky rules: No arbitrary setTimeout, no implicit waits, no sleep.
- Systematic cleanup: Reset mocks/DB/state between tests using the repository's standard hooks.

## Validating Changes

Run focused checks scoped to the changed files after every change.

- Backend (`apps/backend`): `yarn check-ts`, `yarn lint`, `yarn test`.
- Frontend (`apps/frontend`): `yarn relay` (required before build and after any GraphQL schema change), then
  `yarn check-ts`, `yarn lint`, `yarn test`.
- Report exactly what was executed and its outcome. Never claim a check passed without running it.
