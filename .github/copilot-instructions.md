# XTM Hub — GitHub Copilot Instructions

Copilot-specific notes. Everything else — what this is, setup, dev servers, validation commands, the mandatory
coding rules and the commit conventions — is in [`AGENTS.md`](../AGENTS.md), which Copilot loads alongside this
file rather than instead of it.

Per-area rules arrive on their own: each file in [`.github/instructions/`](instructions/) carries a path glob and
names the rule it covers in [`.claude/rules/`](../.claude/rules/). **Open the file it names** — the rules are
there, not in the pointer. Task playbooks are skills in [`.claude/skills/`](../.claude/skills/), which Copilot
reads natively. Custom agents are in [`.github/agents/`](agents/).

Before changing any instruction, rule, skill or agent file, use the `hub-review` skill.

<!-- filigran-conventions:start -->

## Commit, PR & issue conventions

All commits, pull requests and issues in this repository follow the
[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
specification with a GitHub issue reference:

```
type(scope?)!?: description (#issue)
```

- Types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`,
  `build`, `ci`, `revert`.
- The description starts with a lowercase letter and has no trailing period; preserve acronyms and proper nouns.
- Pull request titles **must** end with the related issue reference, e.g.
  `(#1234)`, and every pull request must be linked to an issue.
- Sign your commits.

When generating commit messages, PR titles or issue titles, always follow this convention. See [
`.github/LABELS.md`](LABELS.md) for the full title and label taxonomy.
<!-- filigran-conventions:end -->


<!-- filigran-model-policy:start -->

## GitHub Copilot model usage

To keep token consumption under control, pick the model that matches the task:

- **Opus 4.6** — reserve for complex work: deep reasoning, large refactors, architecture design, tricky debugging. It is
  significantly more token-expensive, so it is not the daily driver.
- **Sonnet / Gemini / GPT** — default for everyday tasks: autocomplete, small fixes, quick questions, code explanations.

We have a limited token budget — being mindful of the model you pick makes a real difference at scale. Think of Opus as
a specialist you call in when you really need it.
<!-- filigran-model-policy:end -->