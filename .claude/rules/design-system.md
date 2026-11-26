---
paths:
  - "apps/frontend/**"
---

# Design system (`@filigran/design-system`)

`@filigran/design-system` is the app's UI library. The legacy `@filigran/ui` copy and its theme are gone (epic #3507):
lint rejects an `@filigran/ui` import and the utility classes only that theme generated
(`xtm-hub-theme-rules/no-legacy-theme-class` in `apps/frontend/eslint.config.mjs`).

- Use the package's consumer skill, `node_modules/@filigran/design-system/skills/consumer/design-system-usage/SKILL.md`,
  and the component's usage contract next to it. They ship with the installed version and win over memory.
- New code imports a component from `@filigran/design-system` when it exists there, and from its folder in
  `src/components/ui/` when the app rebuilt it.
- Adopting a design system component moves every call site and deletes the app's own version, as pull request #3614
  does for `Button`.
- A component the design system lacks is rebuilt in its own folder, `src/components/ui/<kebab-name>/`, with the
  package's layout (`<Name>.tsx`, `<Name>.meta.ts`, `<Name>.test.tsx`, `index.ts`), on design system primitives
  and tokens only, so it can be proposed upstream as is. Its pull request flags it as a design system candidate.
- A migration swaps the app's component for its design system counterpart and keeps the design system's own look:
  visual differences with the surrounding code are expected, never hidden by restyling. A choice made without the
  design team between two options that fit equally is traced for later validation in the pull request, never guessed
  silently. Beyond what the design system component's API imposes (a single-file field, a dialog's sizing or
  keyboard handling), the migration changes nothing else: the code around it and the components next to it stay as
  they are until their own item.
