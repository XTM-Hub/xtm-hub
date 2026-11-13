---
name: review-rfc
description: >-
  Finishes the delivery of a Filigran Flow RFC in XTM Hub once `rfc-delivery/run.sh` built every
  chunk - walks a human through the automated RFC review (traceability of every acceptance criterion,
  coherence across chunks), fixes what they approve on the chunk that owns it, records the decisions,
  then, once the team merged the stacked pull requests, brings the RFC branch up to date and marks its
  pull request ready for the final human review. Launched by `rfc-delivery/run.sh <RFC-ID> review`, or
  when asked to review or close an RFC delivery.
---

# Review and close an RFC delivery

BMAD's retrospective and the epic review of the design system migration, for one RFC. A human is
at the keyboard. The invocation names the RFC's pull request (`issue/<n>` onto `main`), the
tracking pull request in xtm-hub-private, the tracking folder `<dir>`
(`<private>/rfc-delivery/<RFC-ID>`), the command that shows the RFC (`git -C <flow> show <sha>:<path>`)
and the run logs. Answer in the human's language.

The human decides. Ask before every fix that changes behaviour, every commit series and every push.
Never merge a pull request: the team merges. Never run the main loop; the human relaunches it.
The decision rules of `rfc-delivery/WORKFLOW.md` still rule the code (the RFC is right, the chunk and
nothing more), and its Confidentiality section every public text.

## 1. Load the context

Read only, in parallel:

- `<dir>/rfc-review.md`: the automated review, its traceability table and findings.
- `node rfc-delivery/cli.mjs list <dir>` and `rfc-status.yaml`: each chunk, its pull request, its state.
- Each chunk pull request's open review threads, loaded as `rfc-delivery/FEEDBACK.md` (1. Load the
  review) does: what the team already asked.
- The specs' `## To validate` and `## Deferred findings`, and `<dir>/split-review.md`.
- The RFC: its acceptance criteria, test plan, rollout, documentation and decision candidates.

## 2. Check each finding

The stack may have moved since the review. For each finding, open the code it cites and confirm it
still holds. Classify it: **mechanical** (one right fix), **decision** (two defensible answers),
**RFC** (the RFC itself is wrong or silent: it goes to its authors with `/flow:amend`), or **stale**
(say why). Name the chunk that owns the code of each finding.

## 3. Triage with the human

One table, most severe first: `| # | Severity | Finding | Chunk | Evidence | Proposed action |`. Then
finding by finding: **fix now**, **defer** (a follow-up issue) or **reject** (with the reason).
Recommend fixing now whatever leaves an acceptance criterion undelivered or untested.

## 4. Fix on the chunk that owns it

For each approved fix, follow `rfc-delivery/FEEDBACK.md` (3. Fix and 4. Publish and carry up) on the
owning chunk's branch, with `(#<chunk issue>)`; also tick the `To validate` lines the human accepts
as they are (`- [x] …`). Once the fixes are carried up, ask the human to relaunch
`rfc-delivery/run.sh <RFC-ID>`, which waits for the checks of the chunks that moved.

A deferred finding: with the human's go, `gh issue create --repo XTM-Hub/xtm-hub --title
"<type>(<scope>): <what>" --body "Follow-up of #<RFC issue>."`, public wording only, with the type
label and the issue Type that `.github/LABELS.md` (2. Type label) maps from `<type>`, and a bullet
under `## Deferred findings` of its chunk's spec ending with the issue.

Write the decisions under `## Decisions` in `<dir>/rfc-review.md`: who reviewed, when, then
`| # | Finding | Decision | Commit, issue or reason |`. Commit the private folder
(`docs(rfc-delivery): record the review of <RFC-ID> (<RFC-ID>)`) and push the tracking branch.

## 5. Close, once the team merged the stack

The team merges the chunk pull requests into the RFC branch as `rfc-delivery/README.md` (The stack)
says. Check with `gh pr view` on each: when every chunk is merged (`rfc-delivery/run.sh <RFC-ID>` records it
as `merged`):

1. Bring the RFC branch up to date: `git checkout issue/<n> && git pull`, then merge `origin/main` if
   it moved; resolve conflicts with the human, run the touched workspaces' validation, push.
2. Wait for the RFC pull request's required checks.
3. With the human's go: `node rfc-delivery/cli.mjs set <dir> rfc_status done`, commit and push the
   tracking branch, `gh pr ready <RFC pull request>`, and a comment on it summing up the stack in
   public words. The final review and the merge to `main` are the team's.
4. Remind the human of the Flow side: the RFC's `delivery.stage`, `links.prs` and its decision
   candidates (`/flow:write-adr`) are updated in filigran-flow, and the tracking pull request is
   merged with the final one.
