# XTM Hub — GitHub Copilot Instructions

Copilot-specific entry point. The repository-wide context — what this is, the workspace table, `corepack`/
`yarn install` setup, local infrastructure, dev servers, the `test:ci` validation commands, the mandatory coding
rules, the GraphQL data flow and the common pitfalls — lives in [`AGENTS.md`](../AGENTS.md), a symlink to
[`CLAUDE.md`](../CLAUDE.md) at the repository root. That file is the canonical, cross-tool source so it stays
accurate for every tool that reads it, not just Copilot. **Read it first.**

This file adds only what is specific to Copilot, plus the two org-synced blocks at the end.

## Path-scoped instructions

Anything scoped to a single area lives in [`.github/instructions/`](instructions/) and is applied automatically by
its `applyTo` glob.

| Scope | File |
| --- | --- |
| `apps/backend/**` | [`backend.instructions.md`](instructions/backend.instructions.md) |
| `apps/frontend/**` | [`frontend.instructions.md`](instructions/frontend.instructions.md) |
| `apps/e2e/**` | [`e2e.instructions.md`](instructions/e2e.instructions.md) |
| Schema, resolvers, Relay operations | [`graphql.instructions.md`](instructions/graphql.instructions.md) |
| Knex / Elasticsearch migrations, seeds | [`migrations.instructions.md`](instructions/migrations.instructions.md) |
| `*.test.ts(x)`, `*.utils.ts` | [`testing.instructions.md`](instructions/testing.instructions.md) |
| Workflows, Docker, Helm | [`ci.instructions.md`](instructions/ci.instructions.md) |

Deeper task guidance lives in [`.github/skills/`](skills/) — a symlink to
[`.claude/skills/`](../.claude/skills/), where the files actually live, kept so Copilot keeps discovering them — and
in [`.github/agents/`](agents/), the Copilot mirror of [`.claude/agents/`](../.claude/agents/). The two agent
directories are the one place the same guidance is written twice, because the `tools:` vocabularies differ: change
one, change the other.

This content drifts as the codebase changes. Use the [`hub-review`](skills/hub-review/SKILL.md) skill to audit it
against the real code — it asks a question (or flags a PR comment) instead of guessing when something doesn't match.

## Review

1. You must use the skill `hub-review`.
2. Follow the workflow.

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
`.github/LABELS.md`](.github/LABELS.md) for the full title and label taxonomy.
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