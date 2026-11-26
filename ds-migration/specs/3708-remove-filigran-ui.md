---
key: 3708-remove-filigran-ui
issue: 3708
epic: epic-4-cleanup
kind: cleanup # ds | candidate | adoption | cleanup
legacy_symbols: []
target_module: "@filigran/design-system"
target_symbols: []
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/theme.css, apps/frontend/src/components/filigran-ui/lib/utils.ts]
---

# Remove the legacy `filigran-ui` copy

## Intent

`src/components/filigran-ui/` now holds only `theme.css` and `lib/utils.ts`, which nothing imports. Delete the folder,
every import of its theme, the `@filigran/ui` aliases and the dependencies only the copy used, and forbid `@filigran/ui`
imports. What the theme still gives the app (the public pages' `container`, the global tracking, the scrollbar) moves to
its design system or Tailwind equivalent, so nothing changes on screen.

The three family items have landed (3800, 3802, and 3801 in 0c25df806): their searches match nothing in `src`, `app`
and `styles`, except the legacy classes that #3797 (ddd7f7f43) brought from `main` into `service/registration/` after
3800 and 3802. Deleting the theme would turn those into dead classes, so this item maps them with the same rules.

## Props mapping

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `import '@filigran/ui/theme.css'` | removed: each file already imports `globals.css` next to it | 5 (`app/not-found`, `app/login/page`, `app/sign-up/page`, `app/(embed)/layout`, `app/(public)/[locale]/layout`) |
| `globals.css` `@import` and `@reference` of the theme, `@source '../src/components/filigran-ui/**'` | removed | 3 lines |
| `tsconfig.json` `paths` `@filigran/ui`, `/clients`, `/servers`, `/auto-form`, `/theme.css`; `vitest.config.ts` aliases `@filigran/ui`, `/clients`, `/servers`, `/auto-form` | removed | 5, 4 |
| `service/registration/` legacy spacing from #3797: `p-xl`, `gap-l`, `gap-m`, `gap-s`, `my-m`, `m-m`, `mr-xs`, `ml-xs` | 3800's mapping: `p-6`, `gap-4`, `gap-3`, `gap-2`, `my-3`, `m-3`, `mr-1`, `ml-1` | 16 (`RegistrationMetadata` 12, `PlatformInformation:19,21`, `RegisteredPlatformHeader:47`, `ConnectedProductButtons:65`) |
| `PlatformInformation:19` `bg-elevation-background-layer-2` | 3802's mapping: `bg-[var(--bg-elevation-default-layer-2)]` | 1 |
| `contentClassName="container pt-4"` (public layout `:80`): Tailwind's `container` plus the theme's `mx-auto`, `px-8` and unlayered 1400px cap | `container mx-auto px-8 pt-4 min-[1400px]:max-w-[1400px]` | 1 |
| `SignUp.css:65` `#hubspot-form .container` (HubSpot markup, styled by the same theme rule) | the rule gains `margin-inline: auto; padding-inline: 2rem`, and a `@media (width >= 1400px)` rule `max-width: 1400px` | 1 rule |
| Theme `@layer base * { letter-spacing: var(--tracking-default) }` (0.0075em) | `globals.css` base `*` rule gains `letter-spacing: var(--tracking-normal)` (the design system's 0.0075em) | 1 |
| Theme `::-webkit-scrollbar*` rules (thumb layer-3, border layer-0) | moved to `globals.css`, reading `var(--bg-elevation-default-layer-3)` and `var(--bg-elevation-default-layer-0)` (same colours in both themes) | 4 rules |
| `AppSnackbars.tsx:14-16` `import '@filigran/design-system/styles/motion.css'` and its comment | `@import '@filigran/design-system/styles/motion.css'` in `globals.css`, after `gradient-helpers.css` (3690 Deferred findings) | 1 |
| `apps/frontend/package.json`: `@radix-ui/react-alert-dialog`, `-aspect-ratio`, `-avatar`, `-checkbox`, `-dropdown-menu`, `-label`, `-radio-group`, `-select`, `-separator`, `-switch`, `-tabs`, `-toast`, `-tooltip`, `class-variance-authority`, `cmdk`, `date-fns`, `react-colorful`, `react-day-picker`, `react-easy-sort` | removed, root `yarn.lock` regenerated with `yarn install` | 19 |
| No lint rule on `@filigran/ui` | `no-restricted-imports` `patterns` entry for `@filigran/ui` and `@filigran/ui/*` ("Import from `@filigran/design-system` or `@/components/ui/`"), in the main rule and in the block that turns the `next-intl` restriction off (restate the rule there with this pattern only, so tests and the translation UI keep it) | 1 file |

Theme entries with no consumer left, deleted with the file and nothing to map: the palette, MUI-era and elevation
`--color-*` tokens and their runtime copies, the legacy `.layer-N` variables (the design system's own `.layer-N` stay),
`--radius-xs` (Tailwind's default `rounded-xs` is the same 0.125rem), `--radius`, `--depth-xs`, the `--font-geologica`
/ `--font-ibm-plex-sans` literals, the Radix fallback variables, the accordion keyframes (`tw-animate-css` ships the
same, and nothing uses them), `popover-content-width-same-as-its-trigger`, the `txt-*`, `heading-*`, `header-jumbo` and
`content-body-*` utilities and their variables, the gradients and the `--spacing-*` scale.

## Files in scope

Delete `src/components/filigran-ui/` (both files and the empty folders). Edit `styles/globals.css`, `tsconfig.json`,
`vitest.config.ts`, `eslint.config.mjs`, `package.json` (frontend), the root `yarn.lock`, the five `app/` files above,
`src/components/signup/SignUp.css`, `src/components/ui/snackbar/AppSnackbars.tsx`, and in
`src/components/service/registration/`: `RegistrationMetadata.tsx`, `PlatformInformation.tsx`,
`RegisteredPlatformHeader.tsx`, `ConnectedProductButtons.tsx`. No test, meta file or e2e locator depends on these
classes or files.

## Screens

```json
[]
```

## Out of scope

- Unused dependencies the copy never used: `autoprefixer`, `@types/react-color`, `extract-files` (Deferred findings).
- Dependencies the app still imports: `@radix-ui/react-accordion`, `-dialog`, `-popover`, `-slot`, `clsx`,
  `tailwind-merge`, `lucide-react`, `embla-carousel*`, `tw-animate-css`, `usehooks-ts`, `@dnd-kit/*`.
- The root `resolutions` for `@radix-ui/react-focus-scope` and `-dismissable-layer`: the design system pulls them in.
- `SignUp.css`'s own variables (`--spacing-*`, `--col-*`, `--typo-*`, `--primary`): declared on `#hubspot-form`, they
  never read the theme.
- `AGENTS.md`, `.claude/rules/design-system.md` and `.claude/rules/frontend.md`, which still describe `@filigran/ui`
  and the legacy theme: instruction drift for `hub-review` (Deferred findings).
- `globals.css`'s `.markdown-content` rules and `--color-filigran-decoration` (design system primitives only).

## Accessibility and i18n

No element, accessible name, role or translation changes.

## Verification

- `apps/frontend/src/components/filigran-ui` does not exist
- A search with Grep for `filigran-ui|@filigran/ui` over `apps/frontend` (excluding `node_modules`, `.next` and
  `eslint.config.mjs`) returns no match
- The Verification searches of `ds-migration/specs/3800-legacy-spacing.md`, `3801-legacy-typography.md` and
  `3802-legacy-colours.md` over `apps/frontend/src`, `app` and `styles` return no match
- `yarn install --immutable` (the lockfile matches the manifests)
- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `yarn workspace @xtm-hub/frontend build` (compiles `globals.css`: an unknown `@apply` or a missing `@reference` fails
  here, never in the tests)
- `node ds-migration/validate.mjs ds-migration/specs/3708-remove-filigran-ui.md`

## Decisions

- **Nothing collides with the design system.** No variable or utility name is declared by both themes: the design
  system resets `--color-*` and ships its colours as `--color-filigran-*`, `--color-feedback-*` and
  `--color-entities-*` (the theme's `*-transparency` names differ), `--radius-sm`…`-full`, `--depth-sm`…`-xl`, and its
  `.layer-N` set only `--bg-elevation-*` and `--border-elevation-*`. Every remaining theme token has no reader in `src`,
  `app` or `styles`.
- **The #3797 classes follow the family items.** The spacing steps take 3800's exact numeric step and the layer-2
  background 3802's per-layer variable, so two items never answer the same question differently.
- **Layout and chrome keep their rendering.** `container`, the global tracking and the scrollbar are app layout, not a
  design system component's styling, and the design system has no utility for them; the target classes and variables
  reproduce today's values (Tailwind's `container` steps, then the theme's 1400px cap). `--tracking-normal` is the
  design system's own default tracking, and the scrollbar reads its layer-0 and layer-3 backgrounds.
- **Fonts come from next/font.** The root layout's `AppContext` sets `--font-geologica` and `--font-ibm-plex-sans` on
  `<html>` for every route; `globals.css` maps the design system's `--font-sans-*` to them. The theme's literal
  `Geologica` / `IBM Plex Sans` values go, leaving next/font's self-hosted faces.
- **Dependencies follow the earlier specs.** Each one listed was deferred here by the item that removed its last legacy
  user (3540, 3541, 3547, 3553, 3558, 3564, 3565, 3568, 3689, 3690, 3691, 3692, 3694, 3695, 3700, 3707); Grep finds no
  import of any of them in `apps/`. The design system ships the Radix packages it needs as its own dependencies.
- **The dependencies nothing imports go too.** `autoprefixer` (the PostCSS config loads only `@tailwindcss/postcss`),
  `@types/react-color` and `extract-files` had no importer in the app (epic-4-cleanup deferred review).
- **The orphan `/auth/login` page goes.** It imported no `globals.css`, but no request ever reached it: the proxy
  rewrites every `/auth/*` path to the backend, and nothing links to it. `/login` is the login page (epic-4-cleanup
  deferred review).
- **The lint ban covers tests too.** The exemption block turns the whole rule off, so it restates it with the
  `@filigran/ui` pattern alone.
- **The agent instructions follow the removal.** `AGENTS.md`, `.claude/rules/design-system.md` and
  `.claude/rules/frontend.md` no longer offer `@filigran/ui` as a fallback nor name the legacy theme, and new code
  takes the design system `<Icon name>`, as its consumer skill and the candidates do; `@filigran/icon` stays in
  existing code until it migrates (epic-4-cleanup review, through `hub-review`).
- **A lint rule rejects the legacy class names.** Once the theme is gone, a legacy spacing, typography or colour class
  brought back from `main` renders nothing and fails no check (#3797 did it during this epic).
  `xtm-hub-theme-rules/no-legacy-theme-class` checks every string of the `*.ts` and `*.tsx` files, tests included,
  against the Verification searches of 3800, 3801 and 3802. The sizing utilities keep `xs` and `xl`, which name
  Tailwind's container sizes again (epic-4-cleanup review).

## To validate

- [x] Global tracking stays on every element (`*`) through `--tracking-normal`. Alternative: set it on `body` only and let
  elements inherit their parent's tracking.
- [x] The thin custom scrollbar stays, now on design system variables. Alternative: drop it for the browser default.
- [x] The public pages and the HubSpot form keep the 2rem gutter and the 1400px cap. Alternative: Tailwind's plain
  `container` (no gutter, 1536px step), or the design system's `w-overlay-xl` (1360px, meant for overlays).

## Deferred findings

