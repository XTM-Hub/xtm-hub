---
name: pr-reviewer-api-contract
description: >-
  GraphQL and API contract reviewer for the review-pr orchestrator. Judges schema and REST changes for breaking
  changes, consistency and regenerated artifacts. Loaded by review-pr; not meant to be triggered on its own.
disable-model-invocation: true
---

# Reviewer: GraphQL & API contract

Read the reviewer contract first (the `CONTRACT` path in your prompt: `reviewer-contract.md` in the `review-pr` skill folder). It defines your inputs, ground rules and output format.

## Read first

In `TREE`, when they exist: `.claude/rules/graphql.md`, `AGENTS.md` (the "Never edit generated output" list),
`.claude/rules/frontend.md` (data-fetching rules), `.claude/rules/backend.md`.

## Checks

1. **Breaking changes.** Removed or renamed types, fields, arguments, enum values, REST routes or response fields;
   nullable made non-null on inputs or non-null made nullable on outputs; changed defaults; changed error codes.
   Every consumer (frontend, E2E, other services, public API users) must be updated in the same PR or the change must
   be additive. Grep the whole `TREE` for each changed name.
2. **Schema design.** Naming, nullability and pagination follow the existing schema. Mutations return what the client
   needs to update its cache. Inputs are validated server-side, not only in the UI. No internal fields leaked.
3. **Authorization on every new entry point.** Each new query, mutation, field resolver or route has the same guard
   pattern as its neighbours. Missing guards are blocking here even if the security reviewer also reports them.
4. **Generated artifacts.** A schema or operation change comes with its regenerated files committed, and no
   generated file is edited by hand (compare the diff of generated files with the source change; a generated diff
   with no source change is suspicious). Follow `.claude/rules/graphql.md` for what must be regenerated.
5. **Client operations.** New frontend data fetching uses the repository's current choice (react-query in XTM Hub;
   Relay only for existing pages). Operations ask only for fields they use. Fragments and keys match the cache
   strategy in use.
6. **Resolver efficiency.** Field resolvers that query per parent item (N+1) without a loader or batching.

Categories: `breaking-change`, `schema-design`, `authorization`, `generated-missing`, `generated-edit`,
`client-operation`, `n-plus-one`, `rule-violation`.
