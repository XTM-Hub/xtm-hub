---
key: 3801-legacy-typography
issue: 3801
epic: epic-4-cleanup
kind: cleanup # ds | candidate | adoption | cleanup
legacy_symbols: []
target_module: "@filigran/design-system"
target_symbols: []
legacy_files_to_delete: []
---

# Legacy typography utilities → `@filigran/design-system` typography

## Intent

The legacy theme (`src/components/filigran-ui/theme.css:418-511`, `543-545`, `580-805`) generates three typography
sets: the Figma styles under their old names (`heading-*`, `header-jumbo`, `content-body-*`, and the
`text-header-heading-*` / `text-content-body-*` font sizes), the MUI-era `txt-*` utilities, and three copies of
design system utilities (`content-highlight`, `content-button`, `content-caption`). Every use in `src/`, `app/` and
`styles/globals.css` moves to the design system utility of the same role, so the typography can go with the copy
(3708). The design system's own line heights and tracking replace the legacy ones on purpose.

## Props mapping

Variants and other classes on the element stay; only the typography class changes. Counts are call sites.

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `heading-2xl`, `-xl`, `-lg`, `-md`, `-sm`, `-xs` | `title-2xl`, `title-xl`, `title-lg`, `title-md`, `title-sm`, `title-xs` | 8, 1, 1, 3, 6, 7 |
| `content-body-base`, `-base-medium`, `-base-bold` | `content-base`, `content-base-medium`, `content-base-bold` | 15, 1 (`CountBadge` default `fontClass`), 2 (`XtmPlatformTrialRequestStepper` `fontClass` and class) |
| `content-body-compact`, `-compact-medium` | `content-compact`, `content-compact-medium` | 14, 2 |
| `text-content-body-base`, `-compact`, `-compact-medium`, `-compact-link` (font size only) | `text-content-base`, `text-content-compact`, `text-content-compact-medium`, `text-content-compact-link` | 14, 14, 1, 2 |
| `text-header-heading-xs`, `text-header-heading-xl` (font size only) | `text-title-xs`, `text-title-xl` | 2, 1 |
| `txt-title` (22px, 400, Geologica) | `title-2xl` | 1 (`AdminGuard`) |
| `txt-subtitle` (16px, 500, Geologica) | `title-sm` | 1 (`OrganizationForm`) |
| `txt-category` (14px, 600, Geologica) | `title-xs` | 3 (`EpicForm`, `ServiceList` ×2) |
| `txt-container-title` (12px, uppercase) | `title-xs uppercase` | 4 (`ShareableResourceDescription`, `ShareableResourceBasicInformation`, `ShareableResourceConnectorSlugPublic`, `[docSlug]/page`) |
| `txt-sub-content` (12px, line height 1.52) | `content-compact` | 7 |
| `globals.css` base `h1 { @apply txt-title }`, `h2 { @apply txt-subtitle }` | `@apply title-2xl`, `@apply title-sm` | 2 |
| `globals.css` `body` `var(--text-content-body-base)`, `var(--font-weight-content-body-base)` | `var(--text-content-base)`, `var(--font-weight-content-base)` | 1 |
| `SignUp.css` `#hubspot-form .form-switch-item` `font-family: var(--font-title)` | `var(--font-title-sm)`: every design system `--font-title-*` is the same Geologica family | 1 |
| Classes no theme defines, rendering nothing: `txt-small`, `txt-default-bold`, `txt-title-xs`, `text-content-body-medium`, `text-content-body-secondary`, `text-content-body-large-medium` | removed, see To validate | 7 (`LastDeployedResourceRow:77`, `XtmPlatformTrialForm:204,212`, `SuggestedActionsChecklist:29`, `TrialGuidePage:52`, `ManageTrialTable:283`, `BundleInfoCard:54`) |
| `theme.css` `@utility content-highlight`, `content-button`, `content-caption` (lines 717-739) | deleted: the design system's utilities of the same name apply | 3 entries |

No call site: `header-jumbo`, `content-body-base-link`, `content-body-compact-bold`, `content-body-compact-link`,
`txt-jumbo`, `txt-tab`, `txt-default`, `txt-body2`, `txt-subtitle2`, `txt-h3`, `txt-h4`, `txt-h5`, `txt-table`,
`txt-mini`, `font-title`, `font-body`, `tracking-default` (as classes; `var(--font-title)` has the `SignUp.css` use above). No class is built dynamically: the two `fontClass`
values are plain strings.

## Files in scope

Every file the Verification search matches today: 54 under `src/`, `app/(public)/[locale]/cybersecurity-solutions/[slug]/[docSlug]/page.tsx`,
`styles/globals.css`, `src/components/signup/SignUp.css`, and `src/components/filigran-ui/theme.css` for the three
deleted entries only. The largest:
`BundleProductCard`, `LogicalMultiSelectFormField`, `XtmPlatformTrialPitch`, `XtmPlatformTrialStatusPanel`,
`RegisteredPlatformCard`, `TrialGuidePage`, `ChecklistItem`, `NavigationSections`, `NavigationLinks`. No test, meta
file or e2e locator uses these classes.

## Screens

```json
[
  {
    "name": "homepage",
    "path": "/app",
    "steps": [{ "click": "role=button[name=\"Reject all\"]" }]
  },
  {
    "name": "xtm-platform-trial-request",
    "path": "/app/service/xtm-platform-trial",
    "steps": [{ "click": "role=button[name=\"Reject all\"]" }]
  },
  {
    "name": "public-roadmap",
    "path": "/en/cybersecurity-solutions/xtm-platform-roadmap",
    "steps": [{ "click": "role=button[name=\"Reject all\"]" }]
  }
]
```

## Out of scope

- The rest of the theme: the typography tokens, `--font-title`, `--font-body`, `--tracking-default`, the base
  `letter-spacing` rule and the unused `txt-*` utilities stay until 3708 removes the copy.
- `var(--font-geologica)` and `var(--font-ibm-plex-sans)` in `globals.css` and `app/font.ts`: next/font's variables,
  set by `AppContext`, which only share their names with the theme tokens.
- Tailwind's own typography (`text-xs`, `text-2xl`, `font-semibold`, `leading-none`, `uppercase`) and the colour
  classes next to the typography ones (3802).

## Accessibility and i18n

Typography only: no element, accessible name, role or translation changes.

## Verification

- A search with Grep for `(^|[^\w-])(txt-[a-z0-9-]+|heading-(2xl|xl|lg|md|sm|xs)|header-jumbo|(text-)?content-body-[a-z-]+|text-header-heading-[a-z0-9]+|font-(title|body)|tracking-default)([^\w-]|$)|--(text|font-weight|font|leading|tracking)-(content-body|header-heading)`
  over `apps/frontend/src`, `apps/frontend/app` and `apps/frontend/styles` (`*.ts`, `*.tsx`, `*.css`), excluding
  `src/components/filigran-ui/theme.css`, returns no match
- A search with Grep for `var\(--(font-title|font-body|tracking-default)\)` over the same paths, excluding
  `src/components/filigran-ui/theme.css`, returns no match
- `theme.css` declares no `@utility content-highlight`, `content-button` or `content-caption`
- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3801-legacy-typography.md`

## Decisions

- **Name for name where the style is the same one.** `llms-full.txt` (Figma annotations, RULE-01 and the designer
  intent table) names the styles `header-heading-*`, `header-jumbo` and `body-*`: the legacy utilities are the
  design system's `title-*`, `title-jumbo` and `content-*` under their Figma names, same family, size and weight.
- **`txt-*` by role, through the `Text` usage contract.** These utilities carry the MUI variants of the other
  products exactly (`txt-title` is the contract's `h1`, 22px 400; `txt-subtitle` its `h2`, 16px). `txt-title` and
  the base `h1` follow the contract's `h1 → title-2xl`, which is also what the app's page titles already use
  (`heading-2xl` on eight of them). `txt-subtitle` and the base `h2` take `title-sm`, not the contract's `h2 →
  title-xl`: the bare `h2`s are card and section titles (`ServiceInstanceCard`, `EpicItemDetailed`, the danger
  zone), and 3536 already gives card titles `title-sm`. `txt-category` is
  `title-xs` exactly; `txt-sub-content` is `content-compact` at a 150% line.
- **A resource's short description is a paragraph, not a heading.** The public resource page and the public connector
  page rendered it as a bare `h2`, which the base `h2` would have made a bold 16px title. It becomes
  `<p className="p-4 content-base">`, the body style (epic-4-cleanup review). The "Overview" title above it moves from
  `h3` to `h2`, so the outline keeps no gap under the page `h1`; its own classes keep its look (Copilot's review).
- **A class that styles nothing goes.** `EpicItemFooter`'s type label carried `bold`, which no stylesheet defines; it
  is removed and the label keeps its `content-compact` rendering (epic-4-cleanup deferred review).
- **The page ends above the cookie banner.** With the design system line heights the fixed banner grew a few pixels
  and covered the login page's Sign in button at 1280x720. While it shows, the banner publishes its height as
  `--cookie-banner-height`: the body reserves it as bottom padding, the application shell and the login layout end
  above it, and the banner keeps its design system look (epic-4-cleanup deferred review, #3836).
- **`uppercase` stays** on the container titles: a text transform the call site wanted, not a size.
- **The three shadowing entries go** (`.claude/rules/design-system.md`): with the same names as the design system
  utilities and imported after them, they overrode their line height (1.25rem or 1rem instead of 150%) for the
  design system's own `Combobox` and `Slider` captions.
- **The cascade does not move.** Each `content-*` and `title-*` target sets the same five properties as the
  Figma-name class it replaces, so Tailwind sorts it at the same place against the single-property utilities next to
  it (`font-bold`, `text-xs`, `text-[13px]`, `leading-none` still win). The `txt-*` utilities set two or three of
  them: their targets newly set the family, weight, line height and tracking, which no single-property utility on
  those elements contradicts (`PaginationArrowButtons` keeps its `leading-none`). No element carries two of these composite classes. Every
  `text-content-*` and `text-title-*` class sits on a plain element: none goes through the design system's `cn`,
  which knows them as font sizes; `NavigationLinks` passes `content-compact` to `buttonVariants`, which neither
  `cn` recognises, as today.

## To validate

- [x] Base `h1` and `txt-title` take `title-2xl` (32px, 500): page titles grow from 22px, the bare `h1`s of the
  registration, roadmap, admin and resource pages included. Alternative: `title-lg` (24px).
- [x] Base `h2` and `txt-subtitle` take `title-sm` (16px, bold). Alternative: the `Text` contract's `title-xl` (28px),
  too large for the card titles that use a bare `h2`.
- [x] Container titles (Overview, Basic information) take `title-xs uppercase` (14px, semibold). Alternative:
  `content-compact-medium uppercase`, which keeps 12px in the body face.
- [x] The six class names no theme defines are removed, keeping today's rendering. Alternative: the style their names
  suggest (`title-xs` for `txt-title-xs`, `content-base-bold` for `txt-default-bold`, `content-base-medium` for
  `text-content-body-medium`).

## Deferred findings

