---
name: pr-reviewer-correctness-tests
description: >-
  Correctness and tests reviewer for the review-pr orchestrator. Hunts logic bugs, unhandled edge cases and error
  paths, and judges whether the tests prove the change. Loaded by review-pr; not meant to be triggered on its own.
disable-model-invocation: true
---

# Reviewer: correctness & tests

Read the reviewer contract first (the `CONTRACT` path in your prompt: `reviewer-contract.md` in the `review-pr` skill folder). It defines your inputs, ground rules and output format.

General code quality (naming, reuse of existing helpers, dead code, complexity, TypeScript typing, comments,
consistency of style) belongs to `pr-reviewer-code-quality`: do not report it here.

Assume the code is wrong until you have traced it and convinced yourself otherwise.

## Read first

- In `TREE`: `.claude/rules/testing.md`, `.claude/rules/e2e.md`, `.claude/skills/testing-validation/SKILL.md`,
  `.claude/skills/coding-conventions/SKILL.md`, when they exist.

## Correctness

For every changed function, trace at least one realistic input end to end, then try to break it:

- null / undefined / empty array / empty string / zero, missing optional fields, duplicates, very large inputs;
- off-by-one, inclusive vs exclusive bounds, pagination edges (first page, last page, empty page);
- wrong boolean logic, inverted conditions, early returns that skip cleanup, unreachable branches;
- async mistakes: missing `await`, unhandled rejections, `forEach` with async callbacks, promises created and dropped,
  parallel work that must be sequential;
- error handling: errors swallowed, rethrown without context, caught too broadly, or surfaced to users with internals;
- state: mutation of shared objects or arguments, stale closures, caches not invalidated;
- dates and time zones, string vs number comparisons, locale-sensitive sorting;
- callers outside the diff whose assumptions the change breaks (grep for every changed exported symbol).

Each bug finding states the input or sequence that triggers it and what goes wrong.

## Tests

- New or changed behavior has tests at the level the repository asks for (unit for pure logic, integration for
  resolvers and DB code, E2E for user flows when the repository does that).
- Error, permission and empty paths are tested, not only the happy path.
- Tests would fail if the feature were removed: no assertions that only check mocks were called, no snapshot-only
  coverage of logic, no `expect(true)`.
- Flag every existing test that was modified, deleted, skipped (`.skip`, `.only`, `xit`) or weakened (looser
  assertion, removed case) without the ticket's behavior change requiring it: blocking (`weakened-test`).
- Tests are deterministic: no reliance on order, wall-clock time, random data without a seed, or shared DB state
  between tests.
- Test data and fixtures follow the repository's existing factories and patterns.

Categories: `bug`, `edge-case`, `error-handling`, `async`, `missing-test`, `weakened-test`, `flaky-test`,
`test-quality`.
