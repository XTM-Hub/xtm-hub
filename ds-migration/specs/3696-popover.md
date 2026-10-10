---
key: 3696-popover
issue: 3696
epic: epic-3-candidates
kind: candidate # ds | candidate | adoption | cleanup
legacy_symbols: [Popover, PopoverTrigger, PopoverContent, popoverContentVariants]
target_module: "@/components/ui/popover"
target_symbols: [Popover, PopoverTrigger, PopoverContent]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/clients/Popover.tsx]
---

# Popover → `@/components/ui/popover`, rebuilt on `Paper` and the Radix popover

## Intent

The design system ships no generic `Popover`: its `DatePicker`, `TimePicker` and `ColorPicker` each open their own
`@radix-ui/react-popover` panel, a `Paper` at elevation 1 with 16px padding and `shadow-global-shadow`, and the
`Tooltip` contract sends rich content to "Popover". The legacy Radix `Popover` (2 call sites: the header's pending users
notifications and the collapsed sidebar's section links) is rebuilt as a candidate in `src/components/ui/popover/` on
that same composition. Both panels keep their trigger, their placement, their width, their content and how they open
and close.

## The component

`src/components/ui/popover/`, the package layout:

- `Popover.tsx` (`'use client'`), on `@radix-ui/react-popover` (already an app dependency, and the design system's own):
  - `Popover` is `PopoverPrimitive.Root`, `PopoverTrigger` is `PopoverPrimitive.Trigger`, unchanged.
  - `PopoverContent` renders `PopoverPrimitive.Portal` > `PopoverPrimitive.Content asChild` > the design system
    `Paper`, so the panel is ONE element: Radix's `role="dialog"`, `id`, `data-state`, `data-side`, `data-align`,
    handlers and ref land on the `Paper` `div`. Props: `PopoverPrimitive.Content` props without `asChild` and `title`
    (Paper's `title` is a header slot, not the HTML attribute), plus `elevation?: Exclude<PaperElevation, 0>`
    (default `1`) and `padding?: PaperPadding` (default `16`), both passed to `Paper`. Defaults `align = 'start'`,
    `sideOffset = 4`, as the design system's own popovers. Classes, merged with the app's `cn` (`@/lib/utils`),
    `className` last, on top of Paper's own: `z-[var(--fds-z-overlay,50)] shadow-global-shadow outline-none`. No
    animation: see Decisions. No default width: the caller sizes the panel. It
    forwards its ref to the `div` and sets `displayName = 'PopoverContent'`.
- `Popover.meta.ts`: `PopoverMeta`, typed `ComponentMeta` from `@filigran/design-system/meta` (type import only): name,
  description (a non-modal floating `Paper` anchored to its trigger, for free content that is not a menu, a listbox
  or a tooltip), `status: 'beta'`, `category: 'feedback'`, `version: '0.1.0'`,
  `radixPrimitive: '@radix-ui/react-popover'`, variants `elevation-1` to `elevation-3`, no size, two examples (a
  button that opens a `w-120` panel with `align="end"`; `padding={8}` with `side="right"`), `props`, and
  `accessibility` with `wcagStatus: 'pending'`, the contrast pair `--text-default-primary` on
  `--bg-elevation-default` at 4.5, and notes: Radix's `role="dialog"`, `aria-expanded` and `aria-controls` on the
  trigger, Escape and an outside press close it and focus returns to the trigger; the caller names the trigger and,
  when the panel has no visible title, the panel (`aria-label`).
- `Popover.test.tsx`: closed by default (no `dialog`); a click on the trigger opens a `dialog` rendered in
  `document.body`, outside the render container, with `aria-expanded` on the trigger; Escape closes it and focus
  returns to the trigger; a press outside closes it; controlled `open` / `onOpenChange`; the panel classes (`layer-1`, `p-4`, `rounded-sm`,
  `shadow-global-shadow`, the overlay `z`) as one constant; `elevation={2}` gives `layer-2`, `padding={0}` and
  `padding={8}` give `p-0` and `p-2`, as one `it.each` in array form; a caller's `w-120` and `pt-4` merge;
  `data-align="start"` by default and `align="end"` reaches it; native and event props pass through (`aria-label`,
  `onMouseEnter`); the ref reaches the panel `div`.
- `index.ts`: exports `Popover`, `PopoverTrigger`, `PopoverContent` and the `PopoverContentProps` type, never the meta.

## Props mapping

Every call site imports the three names from `@/components/ui/popover` and drops them from its `@filigran/ui` import
line (the whole line when they were the only names). `popoverContentVariants` and the `variant` prop have no caller.

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `<Popover open onOpenChange>` + `<PopoverTrigger asChild><Button …/></PopoverTrigger>` + `<PopoverContent align="end" className="w-120 px-0 pt-4 pb-0">`, from `@filigran/ui/clients` | same `Popover` and `PopoverTrigger`; `<PopoverContent align="end" padding={0} className="w-120 pt-4">`, same children | 1 (`NotificationButton.tsx`) |
| `<PopoverTrigger asChild onMouseEnter onMouseLeave><IconButton …/></PopoverTrigger>` + `<PopoverContent sideOffset={0} side="right" align="start" asChild onMouseEnter onMouseLeave><div className="w-50 p-s"><SectionLinksList …/></div></PopoverContent>`, from `@filigran/ui` | same trigger; `<PopoverContent sideOffset={0} side="right" align="start" padding={8} className="w-72" onMouseEnter onMouseLeave><SectionLinksList …/></PopoverContent>`; the `Accordion` names stay on the `@filigran/ui` line | 1 (`ClosedSection` in `NavigationSections.tsx`, rendered by `SharedNavigation` for the private and public sidebars) |
| `variant`, `popoverContentVariants` | removed, no caller; `elevation` covers a panel opened from a raised surface | 0 |

## Files in scope

- `apps/frontend/src/components/ui/popover/Popover.tsx`, `Popover.meta.ts`, `Popover.test.tsx`, `index.ts` (new)
- `apps/frontend/src/components/notification/NotificationButton.tsx`
- `apps/frontend/src/components/menu/navigation/shared/NavigationSections.tsx`
- `apps/frontend/src/components/filigran-ui/components/clients/index.ts` (drop `export * from './Popover'`)
- `apps/frontend/src/components/filigran-ui/components/clients/Popover.tsx` (delete)

The existing tests stay as they are and must pass: `NotificationButton.test.tsx` (click, two links),
`PrivateNavigation.test.tsx` and `PublicNavigation.test.tsx` (hover opens, unhover removes the links). No e2e locator
finds either panel: `navigation-menu.pageModel.ts` drives the expanded sidebar's accordion, not the popover.

## Screens

The bell only shows in a workspace where the user administers the organization or manages access: for the dev admin,
only its personal space ("Personal space" in the switcher), whose panel shows its title and no pending user. Switching
the workspace is stored on the user, so the first screen selects the personal space and the second one, which runs
after it in both themes, selects "Filigran" back (waiting for the reload that drops the bell), collapses the private
menu and hovers the OpenCTI section. Keep that order. The bell is found by its kept `w-9` class: the hidden mobile menu
trigger in the header also has `aria-haspopup="dialog"`. The trial Snackbar is closed first: it covers the panel.

```json
[
  {
    "name": "notifications-panel",
    "path": "/app",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "click": "role=combobox[name=\"Select an organization\"]" },
      { "click": "role=option[name=\"Personal space\"]" },
      { "waitFor": "header button.w-9[aria-haspopup=\"dialog\"]" },
      { "click": "role=button[name=\"Close\"]" },
      { "click": "header button.w-9[aria-haspopup=\"dialog\"]" },
      { "waitFor": "role=dialog" }
    ],
    "clip": "role=dialog"
  },
  {
    "name": "collapsed-sidebar-section",
    "path": "/app",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "click": "role=combobox[name=\"Select an organization\"]" },
      { "click": "role=option[name=\"Filigran\"]" },
      { "waitFor": "header:not(:has(button.w-9[aria-haspopup=\"dialog\"]))" },
      { "click": "role=button[name=\"Collapse sidebar\"]" },
      { "hover": "role=button[name=\"OpenCTI\"]" },
      { "waitFor": "role=dialog" }
    ]
  }
]
```

## Out of scope

- The notification trigger, its red dot and the panel's rows; the sidebar trigger, its hover debounce and
  `SectionLinksList`.
- The `Accordion`, `Sheet` and other exports of `clients/` (their own items).
- `@radix-ui/react-popover` in `apps/frontend/package.json`: the candidate imports it.
- The accessibility gaps listed under Deferred findings.

## Accessibility and i18n

- Unchanged: Radix's `role="dialog"` on the panel, `aria-haspopup="dialog"`, `aria-expanded` and `aria-controls` on the
  trigger, focus moved into the panel on open and back to the trigger on close, Escape and outside press to close. No
  accessible name changes.
- No animation, so nothing to stop under reduced motion; the legacy zoom and slide ignored it.
- No translation key added or removed.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/ui/popover src/components/notification src/components/menu src/components/filigran-ui src/components/admin/user`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3696-popover.md`

## Decisions

- **`Paper` inside `PopoverPrimitive.Content`**: the composition the design system ships three times (`DatePicker`,
  `TimePicker`, `ColorPicker`), so the candidate adds no surface of its own. `Content asChild` makes the `Paper` the
  dialog element itself, which the design system's panels do not, so a caller's `className` and handlers reach the
  visible surface as they did on the legacy content.
- **Elevation 1 and 16px by default**, the design system panels' values; `elevation` replaces the legacy `variant`
  (`layer-2` / `layer-3`) for a panel opened from a raised surface (the `layer-N` rule of `WORKFLOW.md`), `padding`
  takes Paper's scale. The legacy `p-s` (8px) maps to `padding={8}`, `px-0 pb-0` to `padding={0}`.
- **`asChild` is not a prop**: the content already renders through `asChild`. The sidebar's `div` wrapper only carried
  its width and padding. Radix `Slot` concatenated the legacy `w-72 p-4` with its `w-50 p-s` without merging, and
  `w-72` and `p-s` won in the stylesheet: the rendered panel was 288px wide with 8px padding, which
  `className="w-72"` and `padding={8}` keep.
- **`align = 'start'`, `sideOffset = 4`**: the design system's popover defaults. Both callers set `align`; the bell
  keeps its 4px offset.
- **No default width** (legacy `w-72`): both callers set one, and the design system panels each fix their own.
- **`--fds-z-overlay` for stacking, `shadow-global-shadow` for depth**: the design system's overlay conventions, where
  the legacy used `z-50` and `shadow-md`.
- **No animation**: the `Menu` panel's opacity transition never plays on a Radix popover, which mounts already open
  and unmounts at once on close (`Presence` waits for a CSS animation, not a transition). The legacy
  `tailwindcss-animate` zoom and slide go, and the panel appears and disappears at once.

## To validate

- Both panels move from the legacy `bg-elevation-background-layer-2` to `Paper` elevation 1 (`layer-1`), with Paper's
  subtle border and `shadow-global-shadow`. Alternative: elevation 2, the legacy layer.
- The panels open and close without animation instead of zooming and sliding from the trigger. Alternative: a
  keyframe fade, which the design system ships for no overlay.
- `category: 'feedback'` in the meta, next to `Tooltip` and `Dialog`. Alternative: `surface`, next to `Paper`.

## Deferred findings

- The notification bell is an icon-only `Button` with no accessible name; the design system asks for an `IconButton`
  with `aria-label`.
- Neither panel has an accessible name: a `role="dialog"` without `aria-label` or `aria-labelledby`. The notifications
  title `span` could label it.
- The sidebar popover opens on hover only and Radix moves focus into it on open, so a mouse pass over the collapsed
  sidebar steals focus; keyboard users open it with Enter on the trigger. A hover card or a `Menu` would fit better.
- The design system's `Menu` panel carries the same opacity transition, which never plays on a Radix overlay for the
  same reason: an upstream report.
- `PrivateNavigation.test.tsx` can leak the 100ms `useDebounceValue` timer after jsdom teardown (already recorded by
  3689-date-picker).
