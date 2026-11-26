---
key: 3802-legacy-colours
issue: 3802
epic: epic-4-cleanup
kind: cleanup # ds | candidate | adoption | cleanup
legacy_symbols: []
target_module: "@filigran/design-system"
target_symbols: []
legacy_files_to_delete: []
---

# Legacy colour utilities → `@filigran/design-system` colour tokens

## Intent

The legacy theme (`src/components/filigran-ui/theme.css:1-412`, `512-533`, `819-2007`) generates the colour
utilities of the MUI-era palette (`text-primary`, `text-muted-foreground`, `bg-hover`, `border-border`, `ring-ring`),
the old elevation names (`bg-elevation-background-layer-*`, `border-elevation-border-*`, `text-text-default-*`), the
`gray`/`blue`/`red`/`black` scales and their runtime `var(--…)`. The design system resets the Tailwind palette
(`--color-*: initial`) and only ships its semantic tokens, so every use in `src/`, `app/` and `styles/` moves to the
design system token of the same role, and the colours can go with the copy (3708). The design system's own values
replace the legacy ones on purpose.

## Props mapping

Variants (`hover:`, `dark:`, `group-hover:`, `before:`, `focus-visible:`) and the other classes on the element stay;
only the colour class changes. An element that renders only an icon or a logo (`*Icon`, `LogoXTMDark`,
`DisplayLogo`, `LogoFiligranIcon`) takes the icon token of the same role: `text-icon-default`, `-subtle`,
`-disabled`, `-highlight`, `-error`, `-success`, `-alert`. Counts are matching lines.

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `text-text-default-primary`, `-secondary`, `-disabled` | `text-default-primary`, `-secondary`, `-disabled` | 56, 31 files |
| `text-foreground` | `text-default-primary` | 9 |
| `text-muted-foreground`, `text-text-secondary` | `text-default-secondary` | 49, 5 |
| `text-muted-foreground/20`, `/60`; `border-border/70` | `text-[var(--text-default-secondary)]/20`, `/60`; `border-[var(--border-elevation-subtle)]/70` | 3 (`SignUp`, `ShareableResourceConnectorPrivateDetails`, `NavigationSections:65`) |
| `text-primary` | `text-filigran-brand-primary`; icons `text-icon-highlight`; the verified notice's `InfoIcon` (`ShareableResourceConnectorSlug:153`) `text-icon-info` | 51, 37 files |
| `text-destructive` | `text-feedback-error-primary`; the three `WarningIcon` `text-icon-error` | 13 |
| `text-alert-success-primary` | `text-feedback-success-primary`; `ResourceStatusIcons` `ICON_CLASS` `text-icon-success` | 4 |
| `text-alert-alert-primary` (`WarningIcon`), `border-alert-alert-primary` | `text-icon-alert`, `border-alert-alert` | 1, 1 (`XtmPlatformTrialForm`) |
| `text-filigran-ia-main`, `var(--color-filigran-ia-main)` | `text-filigran-ia-primary`, `var(--color-filigran-ia-primary)` | 2 (`PlatformIdentifierMapping`, `TrialGuidePage`) |
| `EditionModeBanner`: `bg-primary text-primary-foreground`; buttons `bg-primary-foreground text-primary hover:bg-primary-foreground/90`, `border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10`; exit link `text-primary-foreground` | `bg-filigran-brand-primary text-negative-primary`; `bg-[var(--text-negative-primary)] text-filigran-brand-primary hover:bg-[var(--text-negative-primary)]/90`, `border-[var(--text-negative-primary)] text-negative-primary hover:bg-[var(--text-negative-primary)]/10`; `text-negative-primary` | 1 file |
| `bg-primary/10`, `shadow-primary` (navigation active state) | `bg-filigran-brand-primary-transparency-10`, `shadow-filigran-brand-primary` | 2 + tests |
| `bg-elevation-background-layer-N`; `bg-card` | `layer-N bg-elevation-default` on the surface, `bg-elevation-default` where its context already is layer N; `layer-1 bg-elevation-default` | 40, 33 files; 2 |
| `bg-elevation-surface-highlight-layer-N` | `bg-elevation-highlight` in a layer-N context, `layer-N bg-elevation-highlight` otherwise | 5 |
| `hover:bg-hover`, `group-hover:bg-hover`, the active option's `bg-hover` | same variant, `bg-elevation-hover`, the surface's `layer-N` resolving it: `HomepageResourceCard:59`, `ServiceInstanceCard:158`, `DetailCard:44` (layer 1), `AutocompleteInput:137-138` (layer 3) | 9 |
| `bg-hover … bg-elevation-background-layer-2` on one box (`XtmPlatformTrialForm:211`) | `bg-[var(--bg-elevation-highlight-layer-2)]`, the highlight of the layer-2 panel it sits on (the ambient highlight equals that panel in dark); the layer class goes, `bg-hover` is later in the stylesheet and is the one that paints | 1 |
| `bg-muted` | `bg-elevation-highlight`; the markdown `th` `bg-elevation-heading` | 4 (`globals.css` ×3, `NavigationSections:65`) |
| `bg-gradient-background` | `bg-gradient-default` | 13 + `Sheet.test` |
| `bg-clip-text text-transparent bg-gradient-legacy-focus` | `text-gradient-focus`; on `PublicSubLink` it moves from the link to its label span, because the utility resets its direct children to `currentColor` | 5 |
| `bg-feedback-{alert,warning,success,neutral,info}-secondary-transparency`, `bg-filigran-brand-primary-transparency` | `…-secondary-transparency-30`, `bg-filigran-brand-primary-transparency-10` | 10 (`TimelineMapping`, `XtmPlatformTrialRequestStepper`, `ShareableResourceConnectorSlug(Public)`, `XtmPlatformTrialLimitations`) |
| `border-border`, `border-border-light`, `* { @apply border-border }` | `border-elevation-subtle` | 12 |
| `border-elevation-border-strong` | `border-elevation-subtle` on the shell header and the roadmap block; `border-elevation-default` on the Thread date pill and the two buttons; dropped on the mobile menu `SheetHeader`, which draws no border | 6 |
| `border-elevation-border-{subtle,default,strong}-layer-N`, `divide-elevation-border-subtle-layer-N` | `border-elevation-subtle`, `border-elevation-default` (strong too), `divide-[var(--border-elevation-subtle)]` in their layer-N context; five border-only elements on another layer than their context keep `border-[var(--border-elevation-*-layer-N)]` (`PaginationControls:26`, `ChecklistItem:18`, `XtmPlatformTrialMessagePanel:17`, `XtmPlatformTrialStatusPanel:97`, `ManageTrialRoleDescriptions:42`), since a `layer-N` there would move their descendants | 14, 9 files |
| `border-primary` | `border-filigran-brand-primary` | 2 |
| `ring-ring` (every variant), `focus-visible:ring-primary` | `ring-focus` | 5, 1 |
| `border-orange`, `border-red` (warning and error notices) | `border-alert-warning`, `border-alert-error` | 4, 3 |
| `border-blue` | `RegistrationDetails:106` panel `border-filigran-brand-primary`; verified notice `ShareableResourceConnectorSlug:152` `border-alert-info` | 2 |
| `bg-blue` (date dot), `bg-blue/5`, `bg-blue-800/5`, `bg-red-500` (unread dot), `bg-green-100 … dark:bg-turquoise-900` | `bg-filigran-brand-primary`, `bg-filigran-brand-primary-transparency-10` (both), `bg-feedback-error-primary`, `bg-feedback-success-secondary-transparency-30` (no `dark:` override) | 1 + test, 4, 1, 2 |
| Fixed colours painted over fixed artwork: `bg-blue-900`, `from-blue to-turquoise-300` (`ServiceInstanceCard`), `bg-grayblue-1000` (`EeBadge`), `text-black-1000` (`ThreadConferenceBanner` CTA), `bg-black-1000`, `/90`, `/0` (`MultipleImagesField`), `dark:bg-black-1000`, `/60`, `/80` | the primitive of the same value: `bg-[var(--blue-900)]`, `from-[var(--blue-400)] to-[var(--turquoise-300)]`, `bg-[var(--grayblue-1000)]`, `text-[var(--black-1000)]`, `bg-[var(--black-1000)]` with the same modifiers and variants | 10 |
| Classes no theme defines, rendering nothing: `hover:shadow-white` (`NavigationSections:175`, `navigation-styles:4`), `border-light` (`feature-voting-theme:141`, `[docSlug]/page:275`, `LogoField:76`), `bg-elevation-bg-layer-0` (`AppFooter:50`), `text-text-brand-primary` (`TrialsExternalLink:28`) | removed, see To validate | 8 |
| `text-white`, `text-white/70` (Thread voting banner), rendering nothing | `text-[var(--white-1000)]` on the container, `text-[var(--white-500)]` (Decisions) | 2 |
| `globals.css`: `html { @apply bg-background }`, body `var(--gradient-background)` and `var(--color-text-default-primary)`, markdown `text-primary` and `text-muted-foreground`, `[data-content-editable]` `var(--color-primary)` ×2 and `var(--color-yellow-400)` ×2 | `@apply bg-elevation-default`, `var(--gradient-default)`, `var(--text-default-primary)`, `text-filigran-brand-primary`, `text-default-secondary`, `var(--color-filigran-brand-primary)`, `var(--color-feedback-alert-primary)` | 1 file |
| `globals.css` runtime copies `--hover-background`, `--color-primary`, `--color-foreground`, `--color-destructive`, `--color-primary-foreground`, `--color-ds-bg` (`:root`) and `--hover-background` (dark) | deleted: nothing reads them once this item lands | 7 |
| `SignUp.tsx`: `style={{ backgroundColor: 'var(--color-ds-bg-1)' }}`, scrollbar `var(--muted-foreground)` | `className` gains `bg-[var(--bg-elevation-default-layer-0)]`, the `style` goes; `var(--text-default-secondary)` | 2 |
| `SignUp.css`: `var(--color-foreground)`, `var(--muted-foreground)`, `var(--color-primary)`, `var(--color-primary-foreground)`, `var(--color-destructive)` (`.hs-error-msg`), `var(--color-ds-bg)`, `var(--color-grayblue-700)` (field fill), `var(--color-grayblue-500)` (field border), `var(--color-white-1000)`, `-500`, `-300` | `var(--text-default-primary)`, `var(--text-default-secondary)`, `var(--color-filigran-brand-primary)`, `var(--text-negative-primary)`, `var(--text-input-error)`, `var(--bg-elevation-default-layer-0)`, `var(--bg-input-default)`, `var(--border-elevation-subtle)`, `var(--white-1000)`, `-500`, `-300` | ~45 |
| `theme.css:532` `--background-image-gradient-ia` | deleted: it generates `bg-gradient-ia`, the name of a design system utility | 1 entry |

No class is built dynamically: `TimelineMapping`, `ICON_CLASS`, `NAVIGATION_ACTIVE_CLASSES`, `card_background` and
`iconClassName` hold the names as plain strings.

## Files in scope

Every file the Verification search matches today (139: 135 under `src/`, 3 under `app/`, `styles/globals.css`), plus
`src/components/filigran-ui/theme.css` for the one deleted entry. The largest: `BundleProductCard`, `SignUp`,
`SignUp.css`, `XtmPlatformTrialForm`, `XtmPlatformTrialStatusPanel`, `NavigationSections`, `NavigationLinks`,
`ServiceInstanceCard`, `EditionModeBanner`, `globals.css`. Tests whose class constants change:
`ThreadConferenceBanner`, `PrivateNavigation`, `PublicNavigation`, `ServiceListHeader` (icons, so
`text-icon-highlight` / `text-icon-subtle`), `RegistrationDetails`, `UserDisplay`, `ResourceStatusIcons`, `Sheet`. No
meta file and no e2e locator finds an element by a colour class.

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

- The rest of the theme: its tokens, `:root` and dark blocks and its `.layer-N` rules stay until 3708 removes the copy.
- The typography of `globals.css` (`--text-content-body-base`, `@apply txt-title`): 3801.
- Raw values that never came from the theme: hex and `rgba` arbitrary classes (`from-[#DEFEA7]`,
  `bg-[rgba(15,188,255,0.21)]`, `EE_GRADIENT`, the `services.ts` card gradients), inline styles of
  `feature-voting-theme`, and Tailwind's own `bg-gradient-to-*`, `text-transparent`, `bg-transparent`.
- `SignUp.css`'s own custom properties (`--primary`, `--dark`, `--light`, `--color-text`, `--border-color`) and hex
  values: only the legacy variables they read change.
- `--color-filigran-decoration` in `globals.css`: the app's own token, on design system primitives.

## Accessibility and i18n

Colours only: no element, accessible name, role or translation changes. The focus rings that `ring-ring` declared
start to render (see To validate).

## Verification

- A search with Grep for `(^|[^\w-])([a-z0-9-]+:)*!?(bg|text|border(-[xytrblse])?|ring(-offset)?|outline|fill|stroke|from|via|to|divide|shadow|decoration|accent|caret)-(border|border-(strong|medium-strong|medium|medium-light|light|focus)|input|ring|background|foreground|primary|primary-foreground|secondary|secondary-foreground|destructive|destructive-foreground|muted|muted-foreground|popover|popover-foreground|card|card-foreground|hover|text|text-[a-z-]+|page-background|box-background|menu-active|light|(gray|darkblue|blue|turquoise|green|red|orange|yellow|purple|grayblue|black|white)(-[0-9]+)?|ai(-[a-z]+)?|ee(-[a-z-]+)?|severity(-[a-z]+)?|alert-[a-z]+-[a-z]+|ds-[a-z0-9-]+|entity-[a-z]+|elevation-(background|surface|border|bg)[a-z0-9-]*|filigran-brand-primary-transparency|filigran-ia-(main|secondary-transparency)|feedback-[a-z]+-secondary-transparency|entities-[a-z-]+-transparency|input-bg-[a-z]+|gradient-(background|layer-0-white|layer-0-layer-1|legacy-focus))(/[0-9]+)?([^\w-]|$)|var\(--(muted-foreground|hover-background|gradient-background|semantic-[a-z0-9-]+|ds-[a-z0-9-]+|color-(border|text|page-background|box-background|menu-active|input|ring|background|foreground|primary|secondary|destructive|muted|popover|card|hover|purple|ai|ee|severity|alert|ds|entity|gray|darkblue|blue|turquoise|green|red|orange|yellow|grayblue|black|white|elevation)[a-z0-9-]*|color-filigran-ia-main|color-filigran-brand-primary-transparency|color-filigran-ia-secondary-transparency|color-(feedback|entities)-[a-z-]+-transparency)\)`
  over `apps/frontend/src`, `apps/frontend/app` and `apps/frontend/styles` (`*.ts`, `*.tsx`, `*.css`), excluding
  `src/components/filigran-ui/theme.css`, returns no match
- A search for `var\(--(primary|primary-foreground|foreground|background|destructive|card|popover|input|ring)\)` over
  `apps/frontend/styles` and the `*.ts` / `*.tsx` files of `src` and `app` returns no match
- `theme.css` declares no `--background-image-gradient-ia`
- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3802-legacy-colours.md`

## Decisions

- **Semantic tokens by role, from the design system's own components.** Brand text is `text-filigran-brand-primary`
  and text on brand is `text-negative-primary` (`Button` default × primary); destructive text is
  `text-feedback-error-primary` (`Button` destructive); notices take `border-alert-*` and `text-icon-*` (`Alert`);
  dividers and outlines `border-elevation-subtle` (`Header`, `Card`, `Tabs`, `Menu`); icons the `text-icon-*` family,
  as `ResourceStatusIcons` already does. `hover:bg-hover` → `bg-elevation-hover` and `text-muted-foreground` →
  `text-default-secondary` follow 3536 and 3564.
- **Same names first.** `text-text-default-*`, the `*-transparency` backgrounds and `filigran-ia-main` are the
  design system tokens under their old names: same values in both themes.
- **A layered surface sets its layer context.** A legacy class that names a layer becomes the design system's context
  class and the ambient utility (`layer-1 bg-elevation-default`), so the inputs, hovers, checkboxes and borders inside
  follow that layer without re-declaring it; an element already in that layer's context takes the ambient utility
  alone. Pinning the per-layer variable instead left every field inside to re-declare the layer, and in dark an input
  without one matched a layer-2 panel (epic-4-cleanup review). A legacy class without a layer takes the ambient
  utility. Legacy `strong` has no design system tier above `default`: a header or block outline takes
  `border-elevation-subtle`, as the design system's `Header` and `Card` draw theirs (epic-4-cleanup review), and the
  rest takes `default`.
- **Fixed colours over fixed artwork take primitives.** The service card header, the EE badge, the Thread CTA and the
  image scrim paint the same colour in both themes on purpose; a themed token would turn the light-theme pill dark
  text on a dark gradient. The design system has no role for them, so they read its primitive of the same value.
- **The Thread voting banner's text is white in both themes.** Its canvas is `#0A0A0A` in both themes, and its
  `text-white` and `text-white/70` never rendered (the design system resets `--color-*`), so the light theme drew
  dark text on near-black. The container takes `text-[var(--white-1000)]`, so the title and the campaign icon inherit
  it, and the description `text-[var(--white-500)]`, the same 70% white, under the fixed-artwork rule above
  (epic-4-cleanup review, then Copilot's review of the icon).
- **Gradient text uses the utility made for it.** `text-gradient-focus` paints through `-webkit-text-fill-color`, so
  `bg-clip-text text-transparent` go with it; it also replaces `bg-gradient-legacy-focus` (`#0015a8 → #00bd94`), the
  same brand-to-tonic pair.
- **tailwind-merge sees the same groups.** Every target is a colour for both `cn`s: the app's (`isAny`) and the design
  system's, which registers `text-default-*`, `text-negative-*` and `text-gradient-*` as text colours. The class that
  wins a merge today wins it after; `Sheet.test` keeps its meaning (`bg-gradient-default` still replaces the panel's
  `bg-elevation-default`). The one element with two backgrounds keeps the one that paints.
- **Classes on design system components are mapped like the others.** About fifteen `Button`s and `IconButton`s carry
  colour classes from earlier items; this item changes their token, not what the call site does (Deferred findings
  lists them). Where two call sites answered the same override differently, the secondary `Button` border, both take
  `border-elevation-default` (epic-4-cleanup review).
- **The status colours are tested.** `ResourceStatusIcons.test` now asserts the default success colour, and
  `RegistrationDetails.test` the success and error colours of the connection status (epic-4-cleanup deferred review).
- **The homepage halo keeps its 30% brand.** `globals.css`'s `--color-filigran-decoration` mixes the design system
  brand at 30%, between the 10% and 55% transparencies it ships. It is a decoration the design system does not cover,
  built on its brand, so it stays (epic-4-cleanup deferred review).
- **A colour class that repeats the design system button's own goes.** `text-filigran-brand-primary` on a tertiary or
  secondary `Button`, or on a tertiary `IconButton` (whose `text-icon-highlight` is the same brand colour in both
  themes), changed nothing: it is removed from `NotificationButton`, `CookieConsentBanner`, `PublicResourceActions`,
  `ShareableResourceSlug` and `ShareLinkButton`. The overrides that do change the rendering stay, traced under Deferred
  findings for the design team (epic-4-cleanup deferred review).
- **The `gradient-ia` entry goes** (`.claude/rules/design-system.md`): it generates the design system's
  `bg-gradient-ia` from the theme. Its value is the design system's own `--gradient-ia`, so nothing moves.
- **The `globals.css` copies go.** They republished legacy colours as runtime variables for `SignUp.css` and the
  editable outline; once those read design system variables, nothing reads the copies. The theme declares its own
  `--hover-background`.

## To validate

- [x] The global border (`* { border-color }`), `border-border` and `border-border-light` take `border-elevation-subtle`:
  gray-200 in light, grayblue-500 in dark, instead of gray-150 / gray-800.
- [x] `text-muted-foreground` (gray-500 in light) takes `text-default-secondary` (gray-700).
- [x] `ring-ring` never painted: `--ring` is `var(--primary) / 80%`, an invalid colour. `ring-focus` makes the keyboard
  focus ring of the homepage cards, the deployed-resource rows and the service cards visible in brand colour.
- [x] The gradient eyebrows and navigation badges render solid brand colour in light, the design system's contrast rule
  for `text-gradient-focus`. Alternative: `bg-gradient-focus bg-clip-text text-transparent`, a gradient in both themes.
- [x] `bg-muted` and the static `bg-hover` box of the trial form take `bg-elevation-highlight` (the box at its layer 2), the table header
  `bg-elevation-heading`. Alternative: `bg-elevation-hover` everywhere `--hover-background` painted.
- [x] `bg-blue/5` and `bg-blue-800/5` (learn-more icon chips and section band) take the brand's 10% transparency, twice
  as strong. Alternative: none at 5% in the design system.
- [x] `RegistrationDetails`' blue outline takes the brand colour; the verified notice's takes `border-alert-info` with an
  info icon. Alternative: `border-alert-info` on both.
- [x] The sign-up right panel (`--color-ds-bg-1`: 97% gray in light, `hsl(218 50% 9%)` in dark) takes the layer-0
  background (gray-100 in light, grayblue-1000 in dark). The route applies no theme class, so the page renders the
  design system's dark defaults whatever the user's theme: the panel is grayblue-1000. Alternative: its gradient stop,
  `--bg-elevation-default-layer-0-gradient`, which is closer in value.
- [x] The eight class names no theme defines, other than the Thread voting banner's (Decisions), are removed, keeping
  today's rendering. Alternative: the colour their names suggest (`border-elevation-subtle` for `border-light`,
  `text-filigran-brand-primary` for `text-text-brand-primary`).
- [x] `EditionModeBanner`'s inverted buttons read `--text-negative-primary` through arbitrary classes: the design system
  has no background utility for the colour of text on brand.

## Deferred findings

- Design system components restyled by colour classes, carried over from earlier items. Default text on tertiary buttons:
  `ConnectedProductItem:60,70` and the sidebar `Button`s of `CollapseMenuButton` and `EditTranslationsButton`
  (`text-default-primary`), the `Sheet` close button (`text-icon-default`). `BundleProductCard:86` draws a tertiary
  `IconButton` as an outlined one (`rounded border border-elevation-default text-default-primary`), the secondary role
  written by hand. The secondary `Button` border is set to `border-elevation-default` on `XtmRoadmap:77` and
  `ManageTrialHeader:103,157,165` (aligned on `XtmRoadmap` in the epic-4-cleanup review; it pinned the layer-0
  border). `NavigationSections:141` sets the navigation active background, `EditionModeBanner` inverts its buttons.
  An adoption of `Navbar` and `Alert`, or the design team's answer on these overrides, would remove them.
- Colours with no design system token, read as raw variables through arbitrary classes. Fixed artwork in both themes
  (Decisions): `ServiceInstanceCard` (`--blue-900`), `EeBadge` (`--grayblue-1000`),
  `MultipleImagesField`'s image scrim and `ThreadConferenceBanner` (`--black-1000`), the Thread voting banner
  (`--white-1000`, `--white-500`). A text token as a background: `EditionModeBanner`'s inverted buttons
  (`--text-negative-primary`, To validate). They skip the tokens-first rule until the design system ships a role for
  a colour fixed across themes and for a background in the colour of text on brand (Kroustille's review of PR #3804).
