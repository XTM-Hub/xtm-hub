# Contradiction Lens

**Goal:** Find two authoritative sources in the AI-instruction surface that give conflicting guidance for the same
situation — guidance that cannot both be followed at once.

## Evidence rules

- "Authoritative source" means `CLAUDE.md`, `.github/copilot-instructions.md`,
  `.github/instructions/*.md`, `.claude/agents/*.md`, `.github/agents/*.agent.md`, or
  `.claude/skills/*/SKILL.md`.
- Quote both sides verbatim before calling something a contradiction; a difference in emphasis, scope, or level of
  detail is not automatically a conflict.
- A more specific, path-scoped instructions file legitimately narrows a general rule — that is not a contradiction
  unless the narrower rule reverses the general one outright (e.g. general docs say "prefer X", the agent file for
  the same area says "never use X").
- A skill and an instructions file covering the same ground is duplication, not contradiction, unless they actually
  disagree on the rule — see `duplication.md` for the overlap case.
- A Claude Code agent and its Copilot mirror disagreeing on a behavioural rule **is** a contradiction, not mere
  duplication: the same task gets different guidance depending on which tool the developer happens to run. A
  difference confined to the frontmatter `tools:` list, or to tool-specific phrasing of the same rule, is not.

## Review sequence

1. For each rule or convention stated in the in-scope content, search the rest of the instruction surface for the
   same topic — grep for the relevant keywords, file paths, or tool names across `.github/instructions/`,
   `.claude/agents/`, `.github/agents/`, and `.claude/skills/`, plus the `CLAUDE.md` files.
   Grep the real paths, not the `.github/skills` or `AGENTS.md` symlinks, or every hit shows up twice and the
   same file looks like it contradicts itself.
2. Compare the wording. If both statements can be true simultaneously (one is a valid special case of the other,
   or they apply to disjoint situations), it is not a finding.
3. If they cannot both be followed at once, it is a finding — quote both sides and name the exact situation where
   they diverge.
4. Judge whether one side is objectively outdated (e.g. it references a pattern the other side explicitly says to
   stop using) — that makes the finding unambiguous. Otherwise it needs escalation.

## Output

Each finding: `lens: contradiction`, `location` (both file locations), `finding` (the one-line statement of what
can't both be true, with both quotes), `status`.
