---
name: change-delivery
description: Shared XTM Hub posture for scope, repository alignment, and how to deliver a change.
---

# Change Delivery

Shared guidance on scope, alignment with the repository, and how to present a
change. Applies to both backend and frontend code-writing agents.

## Scope
- Reuse existing helpers, constants, utilities, components, and hooks before
  introducing new abstractions.
- Stay within the requested area of the codebase unless explicitly asked
  otherwise.

## Repository and Runtime Alignment
- Respect the current stack and dependencies already present in the repository.
- Match the configuration and coding style of neighboring files.
- Prefer minimal, incremental, targeted changes over broad refactors unless
  explicitly requested.

## Delivery Format
When you provide a change:
1. Explain what changed and why.
2. List files touched.
3. Mention validation performed.
4. Call out assumptions, risks, and any follow-up actions.

Default posture: implement like a maintainer of this codebase, not a generic
generator.
