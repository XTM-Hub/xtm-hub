---
name: rfc-delivery-feedback
description: Works through the team's review of one chunk pull request of an RFC delivery with a human - triage, fixes on the chunk's own branch, replies - then carries the fixes up the stack. Launched by `rfc-delivery/run.sh <RFC-ID> feedback <chunk>`.
---

# RFC delivery: answer the review of a chunk

A human is at the keyboard. The invocation names a chunk, its public pull request, its branch, the
tracking folder in the private repository and the RFC. The team reviewed the chunk's pull request;
help the human answer that review, fix what they approve on the chunk's branch, and carry the
fixes into the chunks stacked above it. Answer in the human's language.

The human decides. Ask before every fix that changes behaviour, before every commit series, and
before every push. Never run the main loop. `rfc-delivery/WORKFLOW.md` still rules the code: the RFC
is right, the chunk and nothing more, and the public texts follow its Confidentiality section.

## 1. Load the review

- The comments, reviews and inline threads of the pull request, unresolved first:
  `gh pr view <pr> --comments`, `gh api repos/<repository>/pulls/<pr>/comments --paginate`,
  `gh api repos/<repository>/pulls/<pr>/reviews`.
- The chunk spec and its criteria, the plan entry (`node rfc-delivery/cli.mjs chunk <dir> <chunk>`).
- The chunks above it: `node rfc-delivery/cli.mjs above <dir> <chunk>`. A fix here reaches them.

## 2. Triage

One table, most important first: `| # | Who | Comment | Evidence in the code | Proposed action |`.
Classify each comment:

- **Fix**: real and in this chunk's scope.
- **Elsewhere**: real, but another chunk owns it (name it) or the RFC excludes it: reply with where it
  goes; a later chunk not built yet gets a line in its `invoke_dev_with` in `chunks.yaml`, with the
  human's go, in the tracking pull request.
- **RFC question**: the comment questions the RFC itself. It goes to the RFC's authors (a review
  thread in filigran-flow, or `/flow:amend` with them), not into the code.
- **Disagree**: explain why, with evidence, and let the human choose.

## 3. Fix, one comment at a time

1. Check out the chunk's branch, up to date with its remote.
2. Implement through `backend-code-writer` or `frontend-code-writer` beyond a few lines, with the
   comment, the decision and the spec.
3. Verify with the spec's Verification commands. Never the e2e suite.
4. Commit, signed, no trailer: `fix(<scope>): <what changed> (#<issue>)`, body saying why.
5. Record a decision that changes the spec under its `## Decisions`, in the private repository.

## 4. Publish and carry up

With the human's go:

1. `rfc-delivery/run.sh <RFC-ID> restack <chunk>`: pushes this branch, merges it into each chunk above
   (a Stack fix session resolves conflicts), pushes them, and puts the chunks that moved back in
   review.
2. Reply to each thread: what was fixed and in which commit, or why not. Resolve the threads the
   human agrees are settled.
3. Ask the human to relaunch `rfc-delivery/run.sh <RFC-ID>`: it waits for the checks of every chunk
   that moved.
