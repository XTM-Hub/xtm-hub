---
key: 3692-separator
issue: 3692
epic: epic-3-candidates
kind: candidate # ds | candidate | adoption | cleanup
legacy_symbols: [Separator]
target_module: "@/components/ui/separator"
target_symbols: [Separator]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/clients/Separator.tsx]
---

# Separator → `@/components/ui/separator`, rebuilt on design system tokens

## Intent

The design system ships no standalone `Separator`: its rules live inside `Menu` (`MenuSeparator`), `Select`
(`SelectSeparator`) and `Navbar` (`NavbarSeparator`), all a 1px `border-t border-elevation-subtle`. The legacy
Radix-based `Separator` (16 call sites in 13 files) is rebuilt as a candidate in `src/components/ui/separator/` with
that same rule, so a standalone separator looks like the ones the design system draws. Every separator keeps its
orientation, its spacing and its height classes, and stays hidden from assistive technology as before.

## The component

`src/components/ui/separator/`, the package layout:

- `Separator.tsx`: `Separator`, a `div` that reproduces what the Radix root rendered, without Radix: `role="none"`
  when `decorative` (default `true`), else `role="separator"` with `aria-orientation="vertical"` when vertical;
  `data-orientation` always. Classes, merged with the app's `cn` (`@/lib/utils`), `className` last:
  `shrink-0 border-elevation-subtle`, then `w-full border-t` (horizontal, default) or `h-full border-l` (vertical).
  Props: the native `div` attributes, `orientation?: 'horizontal' | 'vertical'`, `decorative?: boolean`,
  `className`. It forwards its ref to the `div` and sets `displayName = 'Separator'`.
- `Separator.meta.ts`: `SeparatorMeta`, typed `ComponentMeta` from `@filigran/design-system/meta` (type import only):
  name, description, `status: 'beta'`, `category: 'surface'`, `version: '0.1.0'`, `radixPrimitive: 'none'`,
  variants `horizontal` and `vertical`, no size, two examples, `props`, and `accessibility` with
  `wcagStatus: 'pending'`, no contrast pair, and notes: decorative by default (`role="none"`), so 1.4.11 does not
  apply; `decorative={false}` exposes `role="separator"` and the vertical `aria-orientation`.
- `Separator.test.tsx`: decorative by default (no `separator` role exposed); `decorative={false}` exposes the role,
  with `aria-orientation="vertical"` only when vertical; the horizontal and vertical classes and `data-orientation`;
  a caller's `h-5` replaces the vertical `h-full`; `className` merges; the ref reaches the `div`.
- `index.ts`: exports `Separator` and the `SeparatorProps` type, never the meta.

## Props mapping

Every call site imports `Separator` from `@/components/ui/separator` and drops it from its `@filigran/ui` import
line (the whole line when it was the only name). Colour and width classes go: the component owns them.

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `<Separator />` | `<Separator />` | 5 (`FeatureVoteDetail`, `EpicForm` before "Epic details", `EpicItemCard`, `EeLearnMoreSheet`, `EpicItemDetailed` before the footer) |
| `<Separator className="" />` | `<Separator />` | 1 (`NotificationButton`) |
| `<Separator className="my-s" />` | same | 5 (`RequestTransferPersonalSpace`, `Header` mobile sheet, `SharedNavigation` ×2, `EpicItemDetailed` under the description) |
| `<Separator className="mb-m" />` | same | 1 (`BundleProductCard`) |
| `<Separator className="bg-elevation-border-subtle" />` | `<Separator />`, the colour override goes | 1 (`LastDeployedResourcesClient`) |
| `<Separator orientation="vertical" className="h-6" />` | same | 1 (`EpicForm`, between the edition type and the integration switch) |
| `<Separator orientation="vertical" className="h-5 w-px bg-border" />` | `<Separator orientation="vertical" className="h-5" />` | 1 (`ServiceListHeader`) |
| `<Separator orientation="vertical" className={cn('mt-s flex-1 w-px', timelineMetadata.barClass)} />` | `<div aria-hidden="true" className={cn('mt-s h-full w-px flex-1', timelineMetadata.barClass)} />`, the classes the legacy resolved to (tailwind-merge dropped `w-[1px]`, `bg-elevation-border-strong` and `shrink-0`) | 1 (`EpicList` timeline bar) |

## Files in scope

- `apps/frontend/src/components/ui/separator/Separator.tsx`, `Separator.meta.ts`, `Separator.test.tsx`, `index.ts` (new)
- `apps/frontend/src/components/notification/NotificationButton.tsx`
- `apps/frontend/src/components/profile/form/RequestTransferPersonalSpace.tsx`
- `apps/frontend/src/components/feature-voting/FeatureVoteDetail.tsx`
- `apps/frontend/src/components/Header.tsx`
- `apps/frontend/src/components/epic/EpicForm.tsx`
- `apps/frontend/src/components/epic/EpicList.tsx`
- `apps/frontend/src/components/epic/epic-item/EpicItemCard.tsx`
- `apps/frontend/src/components/epic/epic-item/EpicItemDetailed.tsx`
- `apps/frontend/src/components/service/components/header/ServiceListHeader.tsx`
- `apps/frontend/src/components/menu/navigation/shared/SharedNavigation.tsx`
- `apps/frontend/src/components/service/document/one-click-deploy/EeLearnMoreSheet.tsx`
- `apps/frontend/src/components/homepage/last-deployed-resources/LastDeployedResourcesClient.tsx`
- `apps/frontend/src/components/service/trial-instances/xtm-platform-trial/active-bundle/BundleProductCard.tsx`
- `apps/frontend/src/components/menu/navigation/private/PrivateNavigation.test.tsx`: its two counts of
  `div.bg-elevation-border-strong` (lines 183 and 210) find the `SharedNavigation` separators by the legacy colour
  class; they become `div[data-orientation="horizontal"]`, same expected counts (1 and 2).
- `apps/frontend/src/components/filigran-ui/components/clients/index.ts` (drop `export * from './Separator'`)
- `apps/frontend/src/components/filigran-ui/components/clients/Separator.tsx` (delete)

`MenuSeparator` (`DataTable`, `ServiceListIntegrationDropdown`, `ConnectedProductsDropdown`) already comes from the
design system: untouched. No e2e locator finds a separator.

## Screens

```json
[
  {
    "name": "roadmap-timeline",
    "path": "/app",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "click": "role=link[name=\"XTM Platform Roadmap\"]" },
      { "waitFor": "role=button[name=\"Create\"]" }
    ]
  },
  {
    "name": "epic-form",
    "path": "/app",
    "steps": [
      { "click": "role=link[name=\"XTM Platform Roadmap\"]" },
      { "click": "role=button[name=\"Create\"]" },
      { "waitFor": "role=dialog >> role=checkbox" }
    ],
    "clip": "role=dialog"
  },
  {
    "name": "service-list-display-toggle",
    "path": "/en/cybersecurity-solutions/opencti-integrations",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "waitFor": "role=button[name=\"Select tab view\"]" }
    ],
    "clip": "div.items-center:has(> div.border button[aria-label=\"Select tab view\"])"
  }
]
```

## Out of scope

- `MenuSeparator` and the other design system separators.
- `BundleProductCard`'s `divide-y divide-elevation-border-subtle-layer-1` rows, `XtmRoadmap`'s coloured bars and every
  other hand-rolled rule (`border-t`, `divide-*`) in the app.
- The legacy `Sheet`, `Popover`, `Avatar`, `Accordion`, `AutoForm`, `Form` and `GradientButton` next to the call
  sites (their own items).
- `@radix-ui/react-separator` in `apps/frontend/package.json`: a shared file, removed with the copy (3708).

## Accessibility and i18n

- Every call site is decorative today (`decorative` defaults to `true`, no caller sets it), so every separator keeps
  `role="none"` and stays out of the accessibility tree. The `EpicList` bar becomes an `aria-hidden` `div`: still
  hidden.
- No translation key added or removed.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/ui/separator src/components/menu src/components/epic src/components/notification src/components/profile src/components/feature-voting src/components/homepage src/components/service src/components/Header`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3692-separator.md`

## Decisions

- **`border-t border-elevation-subtle`, the design system's own rule**: `MenuSeparator`, `SelectSeparator`,
  `NavbarSeparator` and the `Header` hairline all draw it. `--border-elevation-subtle` follows the `layer-N` class
  of the surface, so a separator in a sheet or a card matches that surface. The legacy
  `bg-elevation-border-strong` has no design system token (only `subtle` and `default` exist).
- **A `div` with `role="none"`, not an `hr`**: it is what Radix rendered, so the accessibility tree and the
  `data-orientation` hook stay the same. An `hr` would need `role="none"` anyway to stay decorative, plus the user
  agent reset `NavbarSeparator` carries (`border-0 m-0`).
- **A border, not a background**: an empty `div` with `border-t` is 1px tall with no `h-px`, and needs no
  `box-border` defense; vertical takes `border-l` and keeps the legacy `h-full`, which callers replace (`h-5`,
  `h-6`).
- **The app's `cn`**: `border-t` and `border-l` (widths) never conflict with `border-elevation-subtle` (a colour)
  in plain tailwind-merge, and callers pass only layout and spacing classes.
- **The `EpicList` bar leaves `Separator`**: it is a coloured timeline bar (`bg-feedback-*-primary`), not a rule
  between two pieces of content; `Separator` owns its colour. A plain `div` keeps its exact rendering.
- **Colour and width overrides go** (`bg-elevation-border-subtle`, `w-px bg-border`, `className=""`): the design
  system is right on its colour, as `3558-menu` did for `MenuSeparator`.

## To validate

- Every separator goes from `bg-elevation-border-strong` to `border-elevation-subtle`, lighter in both themes,
  including the two that callers had recoloured (`LastDeployedResourcesClient`, `ServiceListHeader`). Alternative:
  `border-elevation-default`, a stronger rule the design system uses for field outlines, not for separators.
- `category: 'surface'` in the meta. Alternative: `data-display`.
- The `EpicList` timeline bar becomes a plain `div` rather than a `Separator` with a colour override. Alternative: a
  `color` or `tone` prop on `Separator`, a new design system API for one caller.

## Deferred findings

- `EpicList` and `XtmRoadmap` both draw a timeline bar from `TimelineMapping.barClass`, by hand, one vertical and
  one horizontal: a shared timeline primitive would carry both.
- `BundleProductCard` separates the same card's rows two ways: a `Separator` in the XTM One branch and
  `divide-y divide-elevation-border-subtle-layer-1` (a legacy token) in the other.
- A caller's height replaces the vertical `h-full` only when plain tailwind-merge knows it as a height (`h-5`,
  `h-6`): a spacing token height (`h-s`, `h-l`) ships next to `h-full` and stylesheet order decides. Neither the
  app's `cn` nor the design system's extends the spacing scale; no caller hits it today.
