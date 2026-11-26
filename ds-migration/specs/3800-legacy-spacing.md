---
key: 3800-legacy-spacing
issue: 3800
epic: epic-4-cleanup
kind: cleanup # ds | candidate | adoption | cleanup
legacy_symbols: []
target_module: "@filigran/design-system"
target_symbols: []
legacy_files_to_delete: []
---

# Legacy spacing utilities → Tailwind's native spacing scale

## Intent

The legacy theme (`src/components/filigran-ui/theme.css:535-541`) declares a named spacing scale, `--spacing-xxs`
to `--spacing-xxl`, from which Tailwind generates `p-s`, `gap-xl`, `mt-l`, `-mx-xl`, `top-m` and so on. The design
system declares no named spacing: its `tokens/theme.css` uses Tailwind v4's native scale (`--spacing: 0.25rem`,
"no theme.css declarations needed"). Every legacy spacing class in `src/` and `app/` becomes the numeric class of
the same value, so the theme scale can go with the copy (3708). Nothing changes on screen.

## Props mapping

The family prefix, variants (`md:`, `sm:`, `hover:`), the negative sign and `!` stay; only the suffix changes.
Families found: `p`, `px`, `py`, `pt`, `pr`, `pb`, `pl`, `m`, `mx`, `my`, `mt`, `mr`, `mb`, `ml`, `gap`, `gap-x`,
`gap-y`, `space-x`, `space-y`, `top`, `right`. Counts are matching lines.

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `*-xxs` (0.125rem) | `*-0.5` | 0 |
| `*-xs` (0.25rem), e.g. `gap-xs` | `*-1`, `gap-1` | 89 lines, 43 files |
| `*-s` (0.5rem), e.g. `p-s`, `my-s`, `sm:gap-s` | `*-2`, `p-2`, `my-2`, `sm:gap-2` | 256 lines, 128 files |
| `*-m` (0.75rem), e.g. `px-m`, `top-m right-m` | `*-3`, `px-3`, `top-3 right-3` | 90 lines, 56 files |
| `*-l` (1rem), e.g. `pt-l`, `sm:pb-l` | `*-4`, `pt-4`, `sm:pb-4` | 114 lines, 68 files |
| `*-xl` (1.5rem), e.g. `space-y-xl`, `-mx-xl` | `*-6`, `space-y-6`, `-mx-6` | 61 lines, 47 files |
| `*-xxl` (2rem), e.g. `gap-xxl`, `ml-xxl` | `*-8`, `gap-8`, `ml-8` | 10 lines, 9 files |
| `<IconButton className="ml-auto m-s">` | `<IconButton className="m-2 ml-auto">`, see Decisions | 2 (`LogoField:66`, `MultipleImagesField:157`) |
| Test constants and selectors: `'pb-s'`, `'my-s'`, `'pl-l'`, `'mt-l'`, `'.pl-m.pb-m > *'` | `'pb-2'`, `'my-2'`, `'pl-4'`, `'mt-4'`, `'.pl-3.pb-3 > *'` | 5 (`Label`, `Separator`, `Sheet`, `AutoForm`, `HomepageResourceCard` tests) |
| Meta examples: `className="my-s"`, `"p-s"`, `"pb-s pr-s"`, `"mt-l"` | `"my-2"`, `"p-2"`, `"pb-2 pr-2"`, `"mt-4"` | 3 (`Separator`, `Accordion`, `AutoForm` meta) |
| `Accordion.meta.ts:28` prose: "the default pt-0 keeps a py-s off the top" | "a py-2 replaces both pb-2 and the default pt-0": once numeric, tailwind-merge drops `pt-0` | 1 |

No class is built dynamically (no `gap-${…}`, no class map, no spacing prop): the two template-literal classNames
(`FeatureVotingCallout:64`, `XtmRoadmap:119`) hold the names as plain text. No legacy name in `var(--spacing-*)`,
`theme()`, `--spacing()` or `@apply`, and no sizing utility (`w-`, `h-`, `max-w-`, `size-`) uses the scale.

## Files in scope

Every file under `apps/frontend/src` and `apps/frontend/app` that the Verification search matches today (176
files: 173 under `src/`, 3 under `app/`), including the test and meta files named above. The largest:
`RegistrationDetails`, `RegistrationLearnMore`, `ShareableResourceConnectorSlug`, `ShareableResourceConnectorSlugPublic`,
`TrialsLearnMore`, `XtmPlatformTrialForm`, `Header`, `XtmPlatformTrialStatusPanel`, `ServiceListHeader`,
`EpicForm`, `EpicList`, `BundleProductCard`. No file under `filigran-ui/` uses the scale. No e2e locator finds an
element by a spacing class.

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
    "name": "public-integrations",
    "path": "/en/cybersecurity-solutions/opencti-integrations",
    "steps": [{ "click": "role=button[name=\"Reject all\"]" }]
  }
]
```

## Out of scope

- The theme itself: `--spacing-xxs` to `--spacing-xxl` stay in `theme.css` until 3708 removes the copy.
- The theme's `container` utility (`padding-inline: 2rem`, 1400px max): a layout utility, not this scale.
- `src/components/signup/SignUp.css`: its own `--spacing-*` variables, scoped under `#hubspot-form`, with other
  values (8px to 32px); they style the embedded HubSpot form, not the legacy theme.
- Arbitrary spacing values (`p-[10px]`, `gap-[6px]`) and numeric classes already in place.
- Typography and colour utilities of the theme (3801, 3802).

## Accessibility and i18n

Spacing only: no accessible name, role or translation changes.

## Verification

- A search with Grep for `(^|[^\w-])-?(p[xytrblse]?|m[xytrblse]?|gap(-[xy])?|space-[xy]|inset(-[xy])?|top|right|bottom|left|start|end|translate-[xy]|w|h|size|min-[wh]|max-[wh]|basis|scroll-[mp][xytrblse]?|indent)-(xxs|xs|s|m|l|xl|xxl)([^\w-]|$)`
  over `apps/frontend/src` and `apps/frontend/app` (`*.ts`, `*.tsx`, `*.css`) returns no match
- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3800-legacy-spacing.md`

## Decisions

- **Tailwind's numeric class, not a design system token**: the design system has no named spacing; its components
  use the native scale (`px-4`, `gap-2`, `pb-6`). With the 0.25rem base, every legacy step has an exact numeric
  equivalent.
- **tailwind-merge starts seeing these classes.** Its spacing scale is `['px', isNumber]`, in the app's `cn` and in
  the design system's own copy, so today `p-s` is an unknown class that it never drops, and Tailwind's stylesheet
  order decides the conflict (same-property utilities sort by name, digits before letters, so the legacy class
  wins). Once numeric, the last class in the merge wins. A read of every `cn` call and every component receiving
  one of these classes found:
  - one change on screen: `<IconButton className="ml-auto m-s">` merged with the base `m-0`. As `m-2`, the later
    shorthand would drop `ml-auto` and give the button a 0.5rem left margin. Written `m-2 ml-auto`, the longhand
    comes last, tailwind-merge keeps both, and the rendering is today's;
  - the same value either way: `px-m` against the Button's `px-4` (`CollapseMenuButton`, `EditTranslationsButton`),
    `m-s` against the IconButton's `m-0` (`VotableFeatureForm`), `gap-s` against the Button's `gap-2`
    (`ManageTrialHeader`), `space-y-m` against AutoForm's `space-y-5` (`LibraryUpdateMetadata`), `pl-l` against
    SheetHeader's `pl-6` (`Sheet.test`): the class tailwind-merge keeps is the one that renders today.
- **The empty footer test checks the footer.** `HomepageResourceCard.test` asserted only that `.pl-3.pb-3 > *` matched
  nothing, which also held with no footer at all; it now asserts the footer renders and is empty (epic-4-cleanup
  deferred review).
- **Tests keep their meaning**: each constant moves to the numeric class of the same value; the `Sheet` caller class
  still replaces the header's own left padding, now through tailwind-merge rather than stylesheet order.

## To validate

None: every replacement has the same computed value, and the one merge that would have moved a button is written to
keep today's margin.

## Deferred findings

