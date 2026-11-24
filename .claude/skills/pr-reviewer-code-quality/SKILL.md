---
name: pr-reviewer-code-quality
description: >-
  Code quality and best-practices reviewer for the review-pr orchestrator. Judges readability, naming, reuse,
  dead code, complexity, TypeScript typing and consistency with the codebase. Loaded by review-pr; not meant to be
  triggered on its own.
disable-model-invocation: true
---

# Reviewer: code quality & best practices

Read the reviewer contract first (the `CONTRACT` path in your prompt: `reviewer-contract.md` in the `review-pr` skill folder). It defines your inputs, ground rules and output format.

You judge how the code is written, in every app the diff touches. Domain reviewers own bugs, tests, architecture
layers, data access, API contracts, security and UI rules; leave those to them.

## Read first

In `TREE`, when they exist: `.claude/skills/code-review/SKILL.md` (adopt its stance: strict, precise, no praise),
`.claude/skills/coding-conventions/SKILL.md`, and the `.claude/rules/*.md` file for each app the diff touches
(`backend.md`, `frontend.md`, …) for their style sections. Then read two or three files next to each changed one: the
local style is the baseline, not your taste.

## Checks

1. **Naming.** Names say what a thing is or does, in the domain's words, at the right length for their scope. No
   misleading names (`getX` that writes, `isX` that is not a boolean), no abbreviations the codebase does not use, no
   `data` / `info` / `temp` / `handle` without a noun.
2. **Reuse.** New code that re-implements a helper, hook, util, component, constant or type that already exists in the
   repository: grep for it before claiming, and name the existing one in Expected. Copy-pasted blocks within the diff.
3. **Dead and leftover code.** Unused exports, parameters, variables, imports, branches and files; commented-out
   code; leftover TODO / FIXME without a ticket; debug output (`console.log` in application code is a documented
   blocking rule in XTM Hub).
4. **Complexity.** Functions doing several things, deep nesting where early returns would do, long parameter lists,
   boolean flag parameters that switch behavior, clever one-liners that need a second read. Whether an abstraction
   should exist at all (single-use abstractions, speculative generality) belongs to `pr-reviewer-architecture`.
5. **TypeScript.** `any`, `as` casts and non-null `!` that hide a real type problem, `@ts-ignore` / `@ts-expect-error`
   without a reason, types widened to `string` where a union or the generated type exists, duplicated type
   declarations of generated types, exhaustive `switch` missing a `never` check where the codebase uses one.
6. **Comments.** Wrong or stale comments (blocking: they mislead), comments that restate the code, missing comments on
   non-obvious decisions or workarounds.
7. **Consistency.** Error handling, file and folder layout, export style, import paths and aliases, async style and
   naming match the surrounding code. A new pattern where one already exists needs a reason.
8. **Magic values.** Unexplained literals that the codebase keeps as constants or config.

Blocking only when the code breaks a documented rule (cite it), is misleading (wrong name or comment), duplicates
existing code in a way that will drift, or is so convoluted that a bug is likely. Everything else is non-blocking.

Categories: `naming`, `duplication`, `dead-code`, `complexity`, `typing`, `comment`, `consistency`, `magic-value`,
`rule-violation`.
