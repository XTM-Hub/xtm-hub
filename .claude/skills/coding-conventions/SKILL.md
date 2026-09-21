---
name: coding-conventions
description: Shared XTM Hub coding conventions and code quality expectations for application code.
---

# Coding Conventions

Shared mandatory coding rules and quality expectations for XTM Hub application code.
Backend and frontend agents both build on these; each layer may add stricter,
stack-specific rules on top.

## Mandatory Coding Rules
- Never use `console.log` in new application code. A layer's instructions file may document a narrow, already-existing
  exception (e.g. frontend.instructions.md's Logging section) — that isn't license to add new ones.
- Prefix every intentionally unused variable with `_` (e.g. `_unused`).
- Use strict typing; avoid `any` unless there is no practical alternative.
- Keep code deterministic, testable, and explicit about errors.
- Domain and app constant names start with an uppercase letter, while keeping
  existing file casing (e.g. `this-file-casing.ts`).

## Code Quality Expectations
- Keep units focused; extract non-UI/pure logic into utility functions when
  complexity grows.
- Validate inputs and handle error paths explicitly (including loading, empty,
  and error states where relevant).
- Consider performance implications (queries, loops, I/O, network calls,
  rerenders, overfetching, large lists) and avoid obvious bottlenecks.
- Preserve existing naming conventions, folder structure, and import style.
- Add concise comments only when the logic is non-obvious, and keep them short — one line on *why*, not *what*.
- When code you're touching already has a comment, update it in place instead of adding a new one alongside it.
  A stale comment left next to a fresh one is worse than no comment; if the old one no longer applies, rewrite or
  remove it rather than layering on more text.
- Never use `as never` — it disables all type-checking entirely and is always forbidden. Use the actual declared type, a proper generated type (e.g. from `@generated/`), or `Partial<T>` with explicit justification. Never use `as never` even in tests.
- Never use as type casts unless strictly necessary and explicitly justified. Prefer proper typing over casting.
