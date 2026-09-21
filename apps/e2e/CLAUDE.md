# E2E — `apps/e2e`

Area rules for this workspace. They live under `.github/instructions/` because GitHub Copilot's `applyTo`
mechanism resolves them from there; this file imports them so Claude Code loads the same content whenever you
touch `apps/e2e/`. Edit the imported files, never this one.

Relative links inside the imported content resolve from `.github/instructions/`.

@../../.github/instructions/e2e.instructions.md

> **If the content of the file(s) above is not in your context**, you started Claude Code from inside this
> workspace instead of from the repository root, and the `@` imports did not resolve — they point outside what is
> then treated as the project root. Read those files yourself, plus the repository root
> [`CLAUDE.md`](../../CLAUDE.md), before making changes.
