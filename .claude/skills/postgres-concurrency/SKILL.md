---
name: postgres-concurrency
description: Shared XTM Hub approach to concurrency problems in the backend. Use when planning, writing or reviewing code that must happen once, stay unique, keep at least one of something, respect a limit or quota, or update a counter, and whenever a lock (`forUpdate`, `withAdvisoryLock`) is added or proposed.
---

# Postgres Concurrency

The goal is not more locks. It is an informed decision about each race: often doing nothing is acceptable, a constraint
or an atomic statement is enough, and a lock is a last resort. What we want to avoid is locks scattered through the
code, or protection on only some of the paths. This skill is a set of things to look at and tell the user, not a
procedure to follow.

Postgres runs `READ COMMITTED` by default, so a "read, decide, write" sequence can interleave with another request's
commit; `withTransaction` alone does not prevent that. Usual signals: "do this once", "must be unique", "at least one
remains", a limit, a quota, a counter.

## 1. The user decides, you inform

You can read from the code who can trigger the path, how many paths touch the data, whether a guard exists and whether
anything would signal a problem. You cannot read how often it happens in production, what it costs the business, or
whether support can fix it, so you are not the one to call the impact negligible or major. Say what you see, recommend,
state the assumption behind the recommendation, and ask. Where you cannot ask (subagent, headless run), put the
assumption and the question at the top of the plan.

- Doing nothing is a valid option. Write down what can happen, why it is acceptable and how someone would notice (an
  error, a log line, a report).
- Flag clearly when the race could grant access that should not exist, lose or corrupt data, or cause damage nobody can
  detect. That tilts toward protecting, but the call is still the user's.
- A risk negligible by construction (a collision on a 48-bit random value): one line, no question.
- If the user proposes a lock or another fix, check it against the rest of this skill and say once, briefly, what you
  see (paths it misses, runtime cost, a lighter alternative). Then do what the user decides.

## 2. Options, lightest first

Pick what fits, not what is listed first.

- **Nothing, documented** (section 1).
- **Database constraint** (unique, foreign key, `CHECK`): callers cannot forget it. Turn a unique violation into a
  domain error with `isUniqueConstraintViolation` (`utils/error/error-guard.util.ts`).
- **One atomic statement**: `INSERT … ON CONFLICT` (see `role-portal.domain.ts`), or `UPDATE`/`DELETE … WHERE …
  RETURNING` where 0 rows means "already handled". Check what the loser gets: `.ignore()` drops its data, `.merge()`
  overwrites the winner's.
- **One shared function** holding the check and the write, so every path goes through it.
- **A lock**, for rules a constraint or single statement cannot express ("at least one X remains"): `forUpdate()` on the
  row (see `deployment.quota.domain.ts`), or one canonical `withAdvisoryLock` (see `deployment.app.ts`).

`SERIALIZABLE` and optimistic version columns have no established pattern here: propose them, do not slip them in.

## 3. Never protect only some paths

A lock or check on one path while others write the same data gives false confidence, which is worse than a documented
gap. Before protecting, state the invariant in one sentence and find every path that can break it: all writers of the
tables involved (`grep` the table and its domain functions), sibling entry points (single vs. bulk, API vs. cron, seed,
migration), writes to another table the rule depends on. Also list everything the losing request still does (inserts,
dispatches, mails), not only the effect you were asked to protect.

If covering every path is large or risky, do not stretch an unrelated PR: protect the path at hand only if that is cheap
and correct on its own, name the unprotected paths in the PR, and propose a dedicated follow-up issue (invariant, paths,
technique, interim recovery). For a security-relevant race, use the private tracker, not a public issue or PR.

## 4. If you lock

- Inside `withTransaction`, or the lock is released immediately and protects nothing. Lock first, then check.
- Lock what the rule depends on: a lock only blocks code taking the same lock or writing the locked rows, not a write to
  another table that changes the same fact.
- A lock costs at runtime: it serializes every request on its key, holds a connection for the whole transaction, can
  deadlock if paths take locks in different orders, and shows up as latency. Cheap on a rare admin action, costly on a
  hot path. Lock the narrowest key, keep the transaction short, never hold it across a slow call (HTTP, search).
  On a parent row prefer `FOR NO KEY UPDATE`: `FOR UPDATE` also blocks inserts into child tables that reference it.
- Fire side effects (dispatch, session refresh) after commit, not inside the transaction.
- Adding a unique constraint fails if duplicates exist: clean them in the same migration (see the `knex-migration`
  skill).
