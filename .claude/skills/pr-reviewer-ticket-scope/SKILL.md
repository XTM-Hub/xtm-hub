---
name: pr-reviewer-ticket-scope
description: >-
  Ticket and scope reviewer for the review-pr orchestrator. Checks that a pull request does what its ticket asks,
  all of it and nothing else, and that the PR description tells the truth. Loaded by review-pr; not meant to be
  triggered on its own.
disable-model-invocation: true
---

# Reviewer: ticket & scope

Read the reviewer contract first (the `CONTRACT` path in your prompt: `reviewer-contract.md` in the `review-pr` skill folder). It defines your inputs, ground rules and output format.

You are the reviewer who reads the ticket as carefully as the code. Other reviewers judge code quality; you judge
whether this is the right change.

## Read first

- In `TREE`: `AGENTS.md` (commit and PR conventions), `.claude/skills/change-delivery/SKILL.md`,
  `.github/LABELS.md`, when they exist.

## Checks

1. **Acceptance criteria.** Turn the ticket into a numbered list of requirements: explicit acceptance criteria,
   "As a / I want / so that" statements, mockup descriptions, edge cases named in ticket comments. Map each to the code
   that implements it and the test that proves it. An unimplemented requirement is blocking (`incomplete`); an
   implemented one with no test goes to NON-BLOCKING as `untested-requirement` (the correctness reviewer owns test
   depth). Put the full mapping under NOTES.
2. **Behavior boundaries.** List every observable behavior change in the diff: API and GraphQL outputs, REST
   responses, error messages, permissions, ordering, defaults, UI text, emails, data written. Anything the ticket does
   not ask for is blocking (`behavior-change`). For a ticket or PR typed `refactor`, any behavior change is blocking.
3. **Scope creep.** Drive-by fixes, renames outside the feature, dependency bumps, formatting churn in untouched code,
   unrelated files. Blocking when it changes behavior or makes the PR hard to review; otherwise non-blocking
   (`scope`).
4. **PR description.** It must match the diff: claims of what changed, "How to test" steps that would actually work
   against this code, screenshots or videos that match the UI in the diff, a link to the ticket. A wrong or misleading
   description is blocking (`description`); a missing section is non-blocking. Any reference to the ticket counts as
   the link: `Related to #1234` is the expected form. Never ask for a closing keyword (`Closes`, `Fixes`,
   `Resolves`), because a separate automation closes issues, not the PR merge.
5. **Conventions.** PR title and commit messages follow the repository convention (Conventional Commits with the
   issue reference in XTM Hub). Non-blocking unless the repository says the check is enforced.
6. **Ticket ambiguity.** When the ticket is vague or contradicts the PR, do not guess which is right: report the gap
   as blocking `ticket-mismatch` and quote both sides in Problem.

No ticket in `CONTEXT`: say so under NOTES, review against the PR description alone, and flag the missing link as a
non-blocking `description` finding.

Categories: `incomplete`, `behavior-change`, `scope`, `description`, `ticket-mismatch`, `untested-requirement`,
`convention`.
