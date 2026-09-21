# Duplication Lens

**Goal:** Find guidance restated across `AGENTS.md`, `.github/copilot-instructions.md`,
`.claude/rules/*.md`, `.claude/agents/*.md`, `.github/agents/*.agent.md`, and `.claude/skills/*/SKILL.md`
instead of one file holding the canonical version and the others linking to it.

## Evidence rules

- Repetition alone is not a finding — only flag it when the duplicate has already drifted (worded differently
  enough that the two copies could diverge silently without either author noticing), or is substantial enough that
  it is likely to drift over time (more than a couple of sentences of concrete rules, not just a shared theme).
- A short cross-reference ("see `X.md` for the full workflow") is not duplication — that is the
  correct pattern, not a problem.
- Prefer the more specific or path-scoped file as the source of truth when proposing a fix (a `.claude/rules/`
  file for stack/workflow detail, a `SKILL.md` for a cross-cutting practice), and the more general file
  (`AGENTS.md`, `copilot-instructions.md`, an agent file) as the one that should link to it instead of restating it.
- The `.claude/agents/*.md` ↔ `.github/agents/*.agent.md` pair is **intentional** duplication: the two tools use
  different `tools:` vocabularies, so both files must exist. Do not propose collapsing them. Flag the opposite —
  a behavioural rule present in one and missing from the other, which means the mirrors have drifted.
- `AGENTS.md` restating anything from a rule file is always a finding: the rule reaches Claude through its
  `paths` glob and Copilot through the `@` include in `copilot-instructions.md`, so the copy is pure drift risk.
  `AGENTS.md` holds only what is true in every session.

## Review sequence

1. For each substantial rule or section in the in-scope content, search the other instruction-surface files for the
   same content — grep for shared keywords, tool names, or file paths.
2. When a candidate duplicate is found, diff the wording side by side. Identical or near-identical text across two
   or more files is the clearest case; paraphrased-but-equivalent rules still count if they'd need to be updated
   together.
3. Propose which file becomes canonical and the replacement link text for the others.

## Output

Each finding: `lens: duplication`, `location` (all files holding the duplicate), `finding` (what's duplicated and
why it's likely to drift), `status` (with the proposed canonical file if fixed or escalated).
