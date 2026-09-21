---
applyTo: '**/*.test.ts,**/*.test.tsx,**/*.utils.ts'
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/*.utils.ts"
---

# Testing Instructions

Both apps use **Vitest**. Test files sit next to the source file they cover (`*.test.ts` / `*.test.tsx`).

Follow [`.claude/skills/testing-validation/SKILL.md`](../skills/testing-validation/SKILL.md) for the full rules on
what to test, how to structure a test (Given/When/Then, `it.each` datasets, fixture constants, mocking policy, and
never rewriting an existing test without asking). This file covers only the XTM Hub-specific tooling those rules
don't name.

## Frontend tooling

- Render with `testRender` from `@/utils/test/test-render` (wraps the providers).
- Mock `next-intl` with `useTranslations: () => (key: string) => key` and assert on i18n keys, not translated copy.
- For `@tanstack/react-query` code (mandatory for new work), mock the query/mutation hooks directly rather than the
  network layer.
- For Relay code (existing pages only, being phased out), mock mutations with `useMutation: () => [vi.fn(), {}]` and
  use `createMockEnvironment()` from `relay-test-utils` for queries.
- Stub heavy components that are not under test (for example `DataTable`) with a simple `<div>`.
- `next/image`, `next/navigation` and other framework-level modules are already mocked globally in
  `setup-vitest.ts` — don't repeat them per file.

## Backend tooling

- Integration tests hit a real `test_database` PostgreSQL instance, selected by `VITEST_MODE=true`.
- Vitest runs with `fileParallelism: false`, so tests share the database — leave it in the state you found it.

## Extract pure utilities instead of testing component internals

Move logic into a pure function in a `*.utils.ts` beside the component, then unit-test that in isolation. The
component just calls the utility.

```
TrialsTab.tsx             calls formatCancellationReason()
trials-tab.utils.ts       pure function, no React/Relay dependency
trials-tab.utils.test.ts  fast, isolated unit tests
```

A utility that imports React, Relay or `next/*` is a sign the split is in the wrong place.
