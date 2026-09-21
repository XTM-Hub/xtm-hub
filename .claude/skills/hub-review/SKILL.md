---
name: hub-review
description: >-
  Reviews the XTM Hub AI-instruction surface — `AGENTS.md`,
  `.github/copilot-instructions.md`, `.claude/rules/*.md`, `.claude/skills/*/SKILL.md`,
  `.claude/agents/*.md` and `.github/agents/*.agent.md` —
  for drift against the real codebase and against each other. Use when asked to review AI instructions, docs, agents,
  or skills; when reviewing a PR/diff that touches any of those paths; or when directed here as
  `skill:hub-review` from another instruction (e.g. the `code-review` skill's "What to check against" documentation
  drift step). Never invoke
  this uninvited on edits you just made without being asked.
---

# Hub Review

Review the AI-instruction surface through independent lenses, each a distinct check with its own evidence bar.
Report only what you actually verified — never pad a report to look thorough, and never claim drift you did not
confirm by reading the referenced file, command, or code. `0` findings for a lens is a valid, expected result.

## Conventions

Bare paths (e.g. `references/stale-reference.md`) resolve from `{skill-root}` — this skill's own directory,
`.claude/skills/hub-review/`. `{project-root}` resolves to the repository root.

The `<!-- filigran-conventions -->` and `<!-- filigran-model-policy -->` blocks, in
`.github/copilot-instructions.md` and `CONTRIBUTING.md`, are synced from an org-wide source. Never edit them and
never rewrite the guidance inside them, and do not report the commit conventions they restate from `AGENTS.md`
— that duplication is deliberate. A reference that objectively does not resolve inside one of those blocks is
still a finding: repair it locally so the link works today, and escalate it as well, because the next sync
overwrites the block and the same break almost certainly exists in the other Filigran repositories.

The surface is shared by two tools, so parts of it are deliberately paired. Treat each pair as one unit:

| Pair | How they are kept identical |
| --- | --- |
| `AGENTS.md` / `CLAUDE.md` | `CLAUDE.md` is the single line `@AGENTS.md` — nothing to compare |
| `.claude/rules/*.md` / `.github/instructions/*.instructions.md` | the rule holds the content and a `paths` glob; the `.github` file is a five-line pointer holding the matching `applyTo` glob. Same globs, no duplicated content |
| `.claude/agents/*.md` / `.github/agents/*.agent.md` | **real duplication** — the `tools:` vocabularies differ, so the two files coexist. Their `name`, `description` and behavioural rules must match; only the frontmatter `tools:` and the tool-specific phrasing may differ. A rule added to one and not the other is a duplication-lens finding. |

## Inputs

- **scope** (optional) — what to review. One of:
  - **PR / diff** — only the instruction-surface files the diff touches, plus anything they reference that the diff
    did not update (a changed convention with a stale cross-reference elsewhere).
  - **Named file(s)** — whatever the caller pointed at.
  - **Full audit** (default when nothing else is specified) — every file under `.claude/rules/`,
    `.claude/skills/`, `.claude/agents/`, `.github/agents/`, plus `.github/copilot-instructions.md`
    `.github/instructions/` and `AGENTS.md`.
- **lenses** (optional) — one or more lens names. Default: all four lenses below.

## Lenses

Each lens is a reference file loaded just-in-time — read only the ones that run.

| Lens | Reference | Catches |
| --- | --- | --- |
| Stale reference | `references/stale-reference.md` | Paths, `yarn` commands, `applyTo` globs, version literals that no longer resolve |
| Contradiction | `references/contradiction.md` | Two authoritative sources giving conflicting guidance |
| Code-usage mismatch | `references/code-usage-mismatch.md` | A documented convention the code no longer follows, or vice versa |
| Duplication | `references/duplication.md` | Guidance restated across files instead of one linking to the other |

## Execution

1. **Resolve scope** per Inputs above and load the in-scope files.
2. **Select lenses** — all four unless the caller named specific ones.
3. **Run each selected lens** — load its reference file from `{skill-root}` and follow it exactly; each lens sees
   only the in-scope content, not another lens's findings. When subagents are available, run all selected lenses in
   parallel: give each subagent its lens's `reference` file (resolved absolute) and the in-scope content, and the
   constraint "Return ONLY your findings in the canonical shape below — no other output, no fixes, no further
   questions." Otherwise run them sequentially yourself.
4. **Classify every finding**:
   - **Unambiguous** — a path/command/glob that objectively does not resolve, an exact stale literal (a hardcoded
     version that contradicts the "reference `.nvmrc`/`packageManager`/catalog" rule), or a duplicate paragraph with
     an obvious single source of truth. Fix it directly.
   - **Ambiguous** — the two sides of a contradiction are both plausible, resolving it requires a product/architecture
     decision, or the convention looks mid-migration (some code follows the old pattern, some the new one, and it's
     unclear which the docs should mandate). Never resolve this yourself.
5. **Escalate every ambiguous finding**, depending on context. Use whichever mechanism the running tool offers —
   Copilot has `add_pr_review_comment` / `reply_and_resolve_review_thread` / `ask_user`; Claude Code has the
   `gh` CLI and `AskUserQuestion`:
   - Reviewing a PR/diff: post an inline review comment on the relevant line, and reply to (then resolve) the
     thread once the author responds.
   - Interactive session with a user present, no PR in scope: ask the concrete question, not a vague
     "does this look right?".
   - Unattended (no PR, no user to ask): open a GitHub issue describing the drift and where it was found.
6. **Assemble and present** per Output below.

## Output

One report grouped by lens. Each finding carries:

- `lens` — which lens produced it
- `location` — file (and line/section) where it lives
- `finding` — what's stale, contradictory, mismatched, or duplicated, in one line
- `status` — `fixed` (with what changed), or `escalated` (with how: PR comment, question asked, or issue link)

A lens with nothing to report states so in one line — do not invent a finding to avoid reporting a clean pass.
