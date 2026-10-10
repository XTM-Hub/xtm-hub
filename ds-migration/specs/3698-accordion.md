---
key: 3698-accordion
issue: 3698
epic: epic-3-candidates
kind: candidate # ds | candidate | adoption | cleanup
legacy_symbols: [Accordion, AccordionItem, AccordionTrigger, AccordionContent]
target_module: "@/components/ui/accordion"
target_symbols: [Accordion, AccordionItem, AccordionTrigger, AccordionContent]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/clients/Accordion.tsx]
---

# Accordion → `@/components/ui/accordion`, rebuilt on the Radix accordion and the design system `Icon`

## Intent

The design system ships no generic `Accordion`: only `NavbarSubmenu` uses `@radix-ui/react-accordion` (one of its own
dependencies), inside its `Navbar`, with the `chevron-down` glyph of `NavbarItem`. The legacy Radix `Accordion`
(4 call sites: the sidebar sections, the sidebar's nested "My products" group, the documents filter sidebar, the trial
role descriptions; plus the legacy `AutoForm` object fields) is rebuilt as a candidate in `src/components/ui/accordion/`
on the same primitive, the design system `Icon` and tokens. Every accordion keeps its type, its default and controlled
values, its content, its accessible names and roles, and how it opens and closes.

## The component

`src/components/ui/accordion/`, the package layout:

- `Accordion.tsx` (`'use client'`), on `@radix-ui/react-accordion` (already an app dependency, and the design system's
  own), classes merged with the app's `cn` (`@/lib/utils`), `className` last:
  - `Accordion` is `AccordionPrimitive.Root`, unchanged (`type`, `collapsible`, `value`, `defaultValue`,
    `onValueChange`).
  - `AccordionItem`: `AccordionPrimitive.Item` with `className`, ref forwarded, `displayName = 'AccordionItem'`.
  - `AccordionTrigger`: `AccordionPrimitive.Header` (`flex`) > `AccordionPrimitive.Trigger`, classes
    `group/accordion-trigger flex flex-1 cursor-pointer items-center justify-between gap-2 py-2 pr-2 text-left
    focus-visible:outline-2 focus-visible:-outline-offset-2 outline-focus`, then `children`, then the chevron: a `span`
    (`inline-flex shrink-0 transition-transform duration-150 motion-reduce:transition-none
    group-data-[state=open]/accordion-trigger:rotate-180`) holding `<Icon name="chevron-down" size={16} />`,
    decorative (`aria-hidden` on the wrapper). The named group keeps a caller's own open `group` ancestor from turning
    the chevron. No `variant` prop, and no `asChild` (`AccordionTriggerProps` omits it): the trigger always renders its
    chevron next to `children`, which a `Slot` cannot take. Ref forwarded to the `button`,
    `displayName = 'AccordionTrigger'`.
  - `AccordionContent`: `AccordionPrimitive.Content` (`overflow-hidden pl-1`, ref and props on it) wrapping a `div`
    whose classes are `cn('pb-2 pt-0', className)`, as the legacy split them: the `pt-0` keeps a caller's `py-s`
    (a spacing tailwind-merge does not read) off the top, as before. No animation (Decisions).
    `displayName = 'AccordionContent'`.
- `Accordion.meta.ts`: `AccordionMeta`, typed `ComponentMeta` from `@filigran/design-system/meta` (type import only):
  name, description (stacked disclosure sections, each a full-width trigger with a `chevron-down` that turns when open,
  over a content region; no typography or colour of its own, the label inherits from the caller), `status: 'beta'`,
  `category: 'navigation'`, `version: '0.1.0'`, `radixPrimitive: '@radix-ui/react-accordion'`, variants `single` and
  `multiple`, no size, two examples (a `type="single" collapsible` list; a `type="multiple"` one with
  `defaultValue`), `props`, and `accessibility` with `wcagStatus: 'pending'`, the contrast pairs
  `--text-default-primary` on `--bg-elevation-default` at 4.5 and, as `Tabs`, the `focus ring`
  `--color-filigran-brand-primary` on `--bg-elevation-default` at 3, and notes: Radix's `button` with `aria-expanded` and
  `aria-controls` inside a heading, the content a `region` named by its trigger, arrows / Home / End between
  triggers, Enter and Space toggle; the chevron is decorative; the inset focus outline survives scroll containers.
- `Accordion.test.tsx`: closed by default (`aria-expanded="false"`, no region); a click opens it (`aria-expanded`,
  a `region` named by the trigger with the content); `type="single" collapsible` closes the open item on a second click
  and opening another closes the first; `type="multiple"` keeps both open; `defaultValue` opens at mount; controlled
  `value` / `onValueChange`; the trigger sits in a heading and carries `data-state`; the chevron wrapper is
  `aria-hidden` and carries the rotate and reduced-motion classes; a closed nested trigger inside an open item keeps
  `data-state="closed"`; the trigger classes as one constant; a caller's `pr-0` replaces `pr-2` and `h-9` is added;
  `AccordionItem`'s `className` reaches the item `div`; `AccordionContent`'s `className` reaches the inner `div` and
  replaces `pb-2` with `pb-0`, and a caller's `py-s` keeps `pt-0`; refs reach the item `div`, the `button` and the
  content `div`.
- `index.ts`: exports the four parts and their props types, never the meta.

## Props mapping

Every call site imports the names from `@/components/ui/accordion` and drops them from its `@filigran/ui` import line
(the whole line when they were the only names). The only class each caller loses is `hover:no-underline`: the
candidate has no hover underline to cancel. Every other caller class stays.

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `<Accordion type="single" collapsible className="w-full">` around `LinkedSection` / `OpenedSection`, `Accordion` from `@filigran/ui` | same | 2 (`SharedNavigation.tsx`, sections and footer sections) |
| `<AccordionItem className="border-none" value>` + `<AccordionTrigger className="h-9 pl-5 py-xs cursor-pointer hover:bg-hover hover:no-underline font-normal hover:shadow-[inset_2px_0px] hover:shadow-white">` + `<AccordionContent>` | same, the trigger without `hover:no-underline` | 1 (`OpenedSection` in `NavigationSections.tsx`) |
| Nested `<Accordion type="single" collapsible className="w-full">` + `<AccordionItem className="border-none pl-0">` + `<AccordionTrigger className={cn('h-9 py-xs pl-6 content-body-compact text-text-default-secondary cursor-pointer hover:bg-hover hover:no-underline', NAVIGATION_HOVER_CLASSES)}>` + `<AccordionContent className="pb-0 pt-0">` | same, the trigger without `hover:no-underline` | 1 (`SectionLinksList` in `NavigationSections.tsx`, in both the expanded sidebar and the collapsed sidebar's popover) |
| `<Accordion type="multiple" defaultValue className>` + `<AccordionItem value className="border-0">` + `<AccordionTrigger className="p-s hover:cursor-pointer content-body-compact-medium">` + `<AccordionContent className="pb-s pt-0 pr-s">` | same | 1 (`ServiceListFilterSection.tsx`) |
| `<Accordion type="single" collapsible className>` + `<AccordionItem>` + `<AccordionTrigger className={cn('py-s pr-0 hover:no-underline cursor-pointer data-[state=open]:border-b-0', …)}>` + `<AccordionContent className>` | same, the trigger without `hover:no-underline` | 1 (`ManageTrialRoleDescriptions.tsx`) |
| `<Accordion type="multiple" className="space-y-5 border-none">` + `<AccordionItem value className="border-none">` + `<AccordionTrigger>{itemName}</AccordionTrigger>` + `<AccordionContent className="p-2">`, from `@/components/filigran-ui/components/clients` | same, the four names from `@/components/ui/accordion`; `FormField` stays on the `clients` line | 1 (legacy `auto-form/fields/Object.tsx`) |
| `variant` (`default`, `colored`) on `AccordionTrigger` | removed, no caller | 0 |

## Files in scope

- `apps/frontend/src/components/ui/accordion/Accordion.tsx`, `Accordion.meta.ts`, `Accordion.test.tsx`, `index.ts` (new)
- `apps/frontend/src/components/menu/navigation/shared/SharedNavigation.tsx`
- `apps/frontend/src/components/menu/navigation/shared/NavigationSections.tsx` (the `Accordion` names only; the
  `Popover` is done)
- `apps/frontend/src/components/service/components/header/filter/ServiceListFilterSection.tsx`
- `apps/frontend/src/components/service/trial-instances/xtm-platform-trial/manage-trial/ManageTrialRoleDescriptions.tsx`
- `apps/frontend/src/components/filigran-ui/components/auto-form/fields/Object.tsx`
- `apps/frontend/src/components/filigran-ui/components/clients/index.ts` (drop `export * from './Accordion'`)
- `apps/frontend/src/components/filigran-ui/components/clients/Accordion.tsx` (delete)

The existing tests stay as they are and must pass: `ServiceListFilterSection.test.tsx` (`aria-expanded` on the
triggers, content shown or absent), `ManageTrialRoleDescriptions.test.tsx`, `PublicNavigation.test.tsx` and
`PrivateNavigation.test.tsx` (trigger `aria-expanded`, `region` named "XTM One", `div[data-orientation="horizontal"]`
counting only the separators: the Radix items stay `vertical`). The e2e locators keep working unchanged and are not
edited: `navigation-menu.pageModel.ts` (`getByRole('button', { name })`, `aria-expanded`, `getByRole('region', { name })`)
and `dashboard.pageModel.ts` (the "OpenCTI" trigger with `[data-state="open"]`): Radix keeps those attributes, and the
decorative chevron adds nothing to the names.

## Screens

The cookie banner is dismissed first. The sidebar screen expands the OpenCTI section of the expanded private sidebar,
then its nested "My products" group (the dev admin has registered OpenCTI platforms), so both levels show open and
closed chevrons. The filter screen clips the public documents list's 250px filter column (the list header above it is
sticky too), whose first section is open by default.

```json
[
  {
    "name": "sidebar-section",
    "path": "/app",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "click": "role=button[name=\"OpenCTI\"]" },
      { "waitFor": "role=region[name=\"OpenCTI\"]" },
      { "click": "role=button[name=\"My products\"]" },
      { "waitFor": "role=region[name=\"My products\"]" }
    ],
    "clip": "nav:has(button[aria-expanded])"
  },
  {
    "name": "documents-filters",
    "path": "/en/cybersecurity-solutions/opencti-custom-dashboards",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "waitFor": "div[class*=\"basis-[250px]\"] button[aria-expanded=\"true\"]" }
    ],
    "clip": "div[class*=\"basis-[250px]\"]"
  }
]
```

## Out of scope

- Moving the sidebar to the design system `Navbar` / `NavbarSubmenu` (Deferred findings).
- The caller classes other than `hover:no-underline`, including the now inert `border-none` / `border-0` on items.
- The `accordion-down` / `accordion-up` keyframes and `--radix-accordion-content-height` in `filigran-ui/theme.css`:
  the theme goes with the copy (3708).
- `@radix-ui/react-accordion` in `apps/frontend/package.json`: the candidate imports it.
- The rest of `AutoForm` (3707) and the other exports of `clients/` (their own items).

## Accessibility and i18n

- Unchanged: Radix's heading (`h3`) around a `button` with `aria-expanded`, `aria-controls` and `data-state`, the
  content `region` labelled by its trigger, the roving arrow keys between triggers. No accessible name changes: the
  `@filigran/icon` chevron and the design system `Icon` both stay out of the name.
- Gained: a visible focus indicator (inset 2px `outline-focus`), where the legacy trigger relied on the browser outline.
- The chevron turn stops under reduced motion; no height animation.
- No translation key added or removed.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/ui/accordion src/components/menu src/components/service/components/header src/components/service/trial-instances src/components/filigran-ui`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3698-accordion.md`

## Decisions

- **Radix accordion, as `NavbarSubmenu`**: the one disclosure the design system ships is built on it; the candidate
  adds no behaviour of its own, so roles, keyboard and `data-state` stay those the tests and e2e locators rely on.
- **`chevron-down` at 16px, turned on the trigger's `data-state`**: `NavbarItem`'s exact chevron, with its
  150ms turn gated on reduced motion. The legacy `ArrowDropDownIcon` (a filled 20px triangle) has no entry in
  `icon-mapping.json`; the chevron inherits the label colour, as `NavbarItem`'s.
- **No typography, colour or hover look of its own**: every caller but `AutoForm` sets the label's type and its hover
  on the trigger or a child `span`; adding a design system typography class would fight their legacy utilities in an
  order tailwind-merge does not resolve. The legacy `font-medium` and `hover:underline` go.
- **Inset focus outline** (`focus-visible:outline-2 focus-visible:-outline-offset-2 outline-focus`), the `TabsTrigger`
  indicator: the sidebar and the filter column are scroll containers that would clip a ring offset outside the row.
- **`py-2 pr-2` and the content's `pl-1` / `pb-2` kept**: the legacy defaults, which every caller overrides or relies
  on for its alignment (the filter counts line up with the chevron through `pr-s`); the same `cn` merges the caller's
  classes as before.
- **No animation**: the legacy height animation comes from keyframes in the legacy theme, which a candidate cannot use,
  and `NavbarSubmenu`'s accordion content opens without one; the same answer as the `Popover` candidate.

## To validate

- The trigger arrow becomes the design system 16px `chevron-down` instead of the legacy 20px filled triangle.
  Alternative: a caret glyph, which the design system `Icon` set does not map.
- The filter and `AutoForm` triggers lose their hover underline, and the legacy `font-medium` goes: the `AutoForm`
  trigger, the sidebar's nested "My products" group (its `content-body-compact` weight now applies) and the trial role
  titles drop from 500 to their own weight; the candidate leaves the label's typography and hover to the caller. Alternative: a built-in `content-compact-medium`
  label and a `bg-elevation-highlight` hover, as `NavbarItem`.
- Sections open and close at once instead of sliding. Alternative: a height keyframe on
  `--radix-accordion-content-height`, which the design system ships for no component.
- `category: 'navigation'` in the meta, next to `Tabs` and `NavbarSubmenu`. Alternative: `surface`.
- The sidebar section rows' hover background and inset accent switch at once: the legacy trigger's `transition-all`
  goes with its hover look. Alternative: a built-in `transition-colors`, which the plain sidebar links next to them
  get from `buttonVariants`.
- The trigger's `gap-2` moves the sidebar section labels 8px right of their icon, now in line with the plain sidebar
  links (which get the same gap from `buttonVariants`), and adds 8px before the chevron. Alternative: no gap, the
  legacy spacing, leaving the section labels 8px left of the links.

## Deferred findings

- The sidebar hand-rolls what the design system `Navbar`, `NavbarItem` and `NavbarSubmenu` ship (expanded accordion,
  collapsed flyout, hover delay, selected accent): an adoption item, not a swap.
- `AccordionItem`'s `border-none` / `border-0` at four call sites target a border no version of the component had.
- No test reaches the nested-object branch of the legacy `AutoForm` (`auto-form/fields/Object.tsx`), the one call site
  whose swap no test checks: for the `AutoForm` item (3707).
- The candidate's tests cover pointer opening only; the keyboard support its meta states (arrows, Home, End, Enter,
  Space) is Radix's and untested here: worth a test when the candidate is proposed upstream.
- Upstream polish: a disabled item (`disabled` on `Accordion` or `AccordionItem`) keeps the `cursor-pointer` and
  enabled look, and the meta's `props` leave out `disabled`, `orientation` and `dir`. No caller uses them.
- The design system `Icon` keeps its whole glyph registry in the bundle; public pages without resource cards may now
  load it through the sidebar chevron. A design system concern (`NavbarItem` pays it too), to measure with a
  `next build` chunk analysis.
