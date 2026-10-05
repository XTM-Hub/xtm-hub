---
paths:
  - "apps/frontend/**"
---

# Design system (`@filigran/design-system`)

`@filigran/design-system` is the target UI library. `@filigran/ui` resolves to a legacy copy in
`apps/frontend/src/components/filigran-ui/` that shrinks as components move to the design system, until it is removed
(epic #3507).

- Use the package's consumer skill, `node_modules/@filigran/design-system/skills/consumer/design-system-usage/SKILL.md`,
  and the component's usage contract next to it. They ship with the installed version and win over memory.
- New code imports a component from `@filigran/design-system` when it exists there, from its folder in
  `src/components/ui/` when the app rebuilt it, and from `@filigran/ui` only otherwise.
- Migrating a component moves every call site, deletes its legacy file from `filigran-ui/` and updates the other
  legacy files that used it, as pull request #3614 does for `Button`.
- A component the design system lacks is rebuilt in its own folder, `src/components/ui/<kebab-name>/`, with the
  package's layout (`<Name>.tsx`, `<Name>.meta.ts`, `<Name>.test.tsx`, `index.ts`), on design system primitives
  and tokens only, so it can be proposed upstream as is. Its pull request flags it as a design system candidate.
- A visual choice made without the design team takes the option closest to the current rendering and is traced for
  later validation in the pull request, never guessed silently.
- While the legacy copy exists, leave its theme (`filigran-ui/theme.css`) and the `@filigran/ui` aliases alone:
  they go away with the copy.
