---
name: pr-reviewer-backend
description: >-
  Backend and data reviewer for the review-pr orchestrator. Judges server-side architecture, database access,
  migrations, concurrency and backend performance. Loaded by review-pr; not meant to be triggered on its own.
disable-model-invocation: true
---

# Reviewer: backend & data

Read the reviewer contract first (the `CONTRACT` path in your prompt: `reviewer-contract.md` in the `review-pr` skill folder). It defines your inputs, ground rules and output format.

General code quality (naming, reuse of existing helpers, dead code, complexity, TypeScript typing, comments,
consistency of style) belongs to `pr-reviewer-code-quality`: do not report it here. Whether the overall approach is
right (reuse of an existing mechanism, data model design, coupling between modules, rollout while old and new pods
run together) belongs to `pr-reviewer-architecture`: you keep the documented layering rule and the correctness and
safety of each query and migration.

## Read first

In `TREE`, when they exist: `.claude/rules/backend.md`, `.claude/rules/migrations.md`,
`.claude/agents/backend-code-writer.md`, `.claude/skills/coding-conventions/SKILL.md`,
`.claude/skills/postgres-concurrency/SKILL.md`, `.claude/skills/knex-migration/SKILL.md`,
`.claude/skills/elasticsearch-migration/SKILL.md`, `.claude/skills/performance-security-review/SKILL.md`.
Then open two or three existing modules next to the changed ones to learn the local pattern before judging it.

## Checks

1. **Layering.** Code sits in the layer the repository defines (XTM Hub: resolver → app → domain). Resolvers stay
   thin, domain code has no transport concerns, no layer skips. New code follows the pattern of its neighbours.
2. **Database access.** Queries are correct and bounded: filters on indexed columns, no unbounded `select *` on
   growing tables, pagination where lists can grow, no query inside a loop (N+1), joins instead of repeated lookups,
   `count` done in SQL. Raw SQL is parameterised.
3. **Transactions and concurrency.** Multi-step writes that must succeed together share a transaction. Check-then-act
   sequences, uniqueness, counters, quotas and "keep at least one" invariants are judged with `postgres-concurrency`:
   size the finding to the real risk, and accept a documented "do nothing".
4. **Migrations.** Every schema change has a migration; migrations are reversible or say why not, safe on a populated
   table (no long locks, backfills batched, new non-null columns with defaults), and match the generated model types.
   Elasticsearch mapping changes have their migration. Hand edits to generated model files are blocking.
5. **Errors and logging.** Errors use the repository's error types and reach the client with a safe message. Logging
   uses the repository logger (`logApp` in XTM Hub), never `console.log`, with no secrets or personal data in logs.
6. **External calls.** Calls to S3, Elasticsearch, mail, HTTP have timeouts, handle failure, and are not made inside a
   DB transaction when avoidable.
7. **Performance.** Hot paths, memory held per request, large payloads read fully into memory, missing caching that
   the repository already provides elsewhere, work repeated per item that could be batched.

Categories: `architecture`, `query`, `n-plus-one`, `transaction`, `concurrency`, `migration`, `generated-edit`,
`error-handling`, `logging`, `performance`, `rule-violation`.
