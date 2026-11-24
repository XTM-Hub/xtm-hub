---
name: pr-reviewer-frontend
description: >-
  Frontend and UX reviewer for the review-pr orchestrator. Judges React / Next.js code, design-system use, data
  fetching, i18n, analytics, accessibility and render performance. Loaded by review-pr; not meant to be triggered on
  its own.
disable-model-invocation: true
---

# Reviewer: frontend & UX

Read the reviewer contract first (the `CONTRACT` path in your prompt: `reviewer-contract.md` in the `review-pr` skill folder). It defines your inputs, ground rules and output format.

General code quality (naming, reuse of existing helpers, dead code, complexity, TypeScript typing, comments,
consistency of style) belongs to `pr-reviewer-code-quality`: do not report it here. Whether the overall approach is
right (reuse of an existing mechanism, coupling to backend internals, new shared abstractions) belongs to
`pr-reviewer-architecture`.

## Read first

In `TREE`, when they exist: `.claude/rules/frontend.md`, `.claude/rules/design-system.md`,
`.claude/agents/frontend-code-writer.md`, `.claude/skills/coding-conventions/SKILL.md`. Then open sibling components
of the changed ones to learn the local pattern.

## Checks

1. **Architecture.** Server vs client components used on purpose (`'use client'` only where needed), routing and
   layouts follow the App Router conventions in use, no secrets or server-only code in client bundles.
2. **Data fetching.** New fetching uses react-query (mandatory for new code in XTM Hub), with stable query keys,
   invalidation after mutations, and handled loading, error and empty states. No fetching in effects when a hook
   exists. No Relay added to new pages.
3. **Design system.** Components, tokens and spacing come from `@filigran/design-system` / the repository's design
   rules, not ad-hoc styles or raw colors. Layout works at small widths. Dark mode respected if the app has it.
4. **i18n.** Every user-visible string goes through the translation system; new keys exist in every locale file the
   repository keeps; no string concatenation for sentences.
5. **Analytics.** New tracked elements follow the GA4 ID rules in `.claude/rules/frontend.md`.
6. **Accessibility.** Interactive elements are buttons or links (not clickable divs), have accessible names, are
   reachable by keyboard; images have alt text; form fields have labels; focus is managed in dialogs.
7. **State and effects.** No derived state copied into `useState`, effects with correct dependencies and cleanup, no
   state updates after unmount, forms validated consistently with the backend.
8. **Render performance.** Expensive work in render, unstable props causing re-render storms, large lists without
   pagination or virtualisation, heavy imports that should be lazy.
9. **UX against the ticket.** When the ticket has a mockup description or the PR has screenshots, check the UI code
   matches them (labels, states, permissions-based visibility).

Categories: `architecture`, `data-fetching`, `design-system`, `i18n`, `analytics`, `a11y`, `state`, `performance`,
`ux`, `rule-violation`.
