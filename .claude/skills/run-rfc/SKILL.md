---
name: run-rfc
description: >-
  Conducts the delivery loop of a Filigran Flow RFC in XTM Hub (`yarn rfc`) from Claude Code -
  has the human run it in a terminal on the side (or launches a short run itself), and when it
  stops, works out why from its log and carries on with the human - debugging a blocked chunk,
  answering a question, approving a held spec, answering the team's review of a chunk pull
  request, then the RFC review. Use when someone
  says "run RFC-XHUB-NNNN", "launch the loop", "continue the delivery of", or asks why a delivery
  stopped. Not for starting a delivery (`start-rfc`).
---

# Run the delivery of an RFC

The loop, `yarn rfc <RFC-ID>`, builds the chunks unattended: its own sessions write the specs and
the code in the RFC's worktree, it commits, pushes and opens the pull requests (see
`rfc-delivery/README.md`). Here you conduct it from this session: launch it, watch it, and handle
each stop with the human, so they never leave the conversation. Answer in the human's language.

You do not do the loop's work: no chunk is specced or coded by hand in its place, and you never
edit `rfc-status.yaml`, but as a brief below tells you. Never merge a pull request: the team merges.

## 1. Before launching

- `yarn rfc <RFC-ID> status`: the chunks per status and the next action. `--dry-run` prints
  only the next action.
- The loop pushes branches and opens pull requests in the public repository. The team's go is the
  approval of the tracking pull request, which the loop checks itself; the human's go for this
  session is theirs to give: say what the next action is and launch only when they ask.
- What `rfc-delivery/README.md` (Commands) lists must be in place: the stack's services, `gh`,
  signing. The loop stops at once with a one-line reason if not.

## 2. Launch and follow

The loop is meant to run on the side for hours: by default, give the human the command to run in
a terminal, in `tmux` to survive closing it: `caffeinate -i yarn rfc <RFC-ID>`. It does not
depend on this session then, and its log does not fill your context. When it stops, they come
back here, and section 3 needs no more than its log.

Launch it from this session only for a short run the human follows (`--once`, a resume) or when
they ask: from the root of this checkout, with the Bash tool in the background
(`run_in_background`, no `&`, no `nohup`). You are notified when it exits; do not poll it. It
runs as long as this session: closing the session stops it cleanly, and a rerun resumes where it
stopped.

When you launched it, follow its log, `<git common dir>/rfc-delivery/<RFC-ID>/run.log`
(`git rev-parse --path-format=absolute --git-common-dir`), with the Monitor tool where you have
it, on `tail -n 0 -F` of the log. Tell the human in one line what matters: a chunk starting, its
pull request opened or ready, a fix attempt, a stop. The sessions' detail is in `events.jsonl` and
one transcript per session in the same folder; read them only to explain a stop.

Never launch a second loop on the same RFC: the loop holds `run.lock` and refuses.

## 3. When it stops

Read the last lines of `run.log` (`STOP:` gives the reason, `FAILED:` a stack trace), then
`yarn rfc <RFC-ID> status`, and handle the case:

| The stop | What to do |
| --- | --- |
| The plan waits for the team | Give the tracking pull request's link; the loop starts once someone other than its author approves it |
| `<chunk> blocked (…)`, including a question for the human | `yarn rfc <RFC-ID> debug <chunk>`, then follow the brief it prints |
| `<chunk>: its spec waits for approved_by` (`spec_checkpoint`) | Show the human the spec, `<private>/rfc-delivery/<RFC-ID>/chunks/<chunk>.md`, and its open points; on their approval, set `approved_by` in its frontmatter to their name, then commit and push it on the tracking branch with their go |
| Services, signing, the worktree has changes, a merge in progress, checks timeout | Fix it with the human, from the reason the line gives |
| `FAILED:` | Read the stack and the last session's transcript, explain, propose; `debug` when it names a chunk |
| `<RFC-ID> is ready for its review` or `waits for its review` | `yarn rfc <RFC-ID> review`, then follow the brief it prints |

`debug`, `feedback` and `review` open an interactive session from a terminal; run here, without a
terminal, they print its brief instead: a document to read fully and follow, and the context (the
chunk, its pull request, the worktree, the tracking folder, the RFC, the logs). Follow it in this
session, as written, with the human at the keyboard. When the brief is done and the human agrees,
launch the loop again (section 2).

## 4. Between runs

- The team reviews the chunk pull requests bottom up: `yarn rfc <RFC-ID> feedback <chunk>`, then
  follow its brief (fixes on the chunk's branch, then `restack`).
- After a change by hand in the worktree: `yarn rfc <RFC-ID> publish`.
- A chunk put aside: `yarn rfc <RFC-ID> resume [<chunk>]`, in the background like the loop.
