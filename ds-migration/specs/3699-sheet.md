---
key: 3699-sheet
issue: 3699
epic: epic-3-candidates
kind: candidate # ds | candidate | adoption | cleanup
legacy_symbols: [Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetOverlay, SheetPortal, SheetTitle, SheetTrigger]
target_module: "@/components/ui/sheet"
target_symbols: [Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/clients/Sheet.tsx]
---

# Sheet → `@/components/ui/sheet`, rebuilt on `Paper` and the Radix dialog

## Intent

The design system ships no side panel: its one modal overlay is `Dialog`, a centred panel on `@radix-ui/react-dialog`,
and the `Paper` contract names "drawer content" as a Paper use. The legacy Radix `Sheet` (3 direct callers: the private
header's mobile menu, the public mobile menu, the Enterprise Edition "learn more" panel; the `SheetWithPreventingDialog`
wrapper behind 28 form sheets in 27 files; `SheetFooter` in 19 forms) is rebuilt as a candidate in `src/components/ui/sheet/` with
the `Popover` candidate's composition: the Radix content rendered as a `Paper`, the `Dialog` scrim, the `Snackbar`
close button. Every sheet keeps its side, its width, its 64px header bar, its scrolling body, its footer, its close
button name and how it opens and closes. As asked on the issue, a dirty form sheet now asks before Escape closes it,
and Escape in an open autocomplete only closes the suggestions.

## The component

`src/components/ui/sheet/`, the package layout:

- `Sheet.tsx` (`'use client'`), on `@radix-ui/react-dialog` (already an app dependency, and the design system's own),
  classes merged with the app's `cn` (`@/lib/utils`), `className` last:
  - `Sheet` is `SheetPrimitive.Root`, `SheetTrigger` is `SheetPrimitive.Trigger`, unchanged.
  - `SheetContent` renders `SheetPrimitive.Portal` > the overlay + `SheetPrimitive.Content asChild` > the design
    system `Paper` (`elevation={2}`, `padding={0}`), so the panel is ONE element: Radix's `role="dialog"`,
    `aria-labelledby`, `data-state`, handlers and ref land on the `Paper` `div`, a direct child of `body`.
    - Overlay: `SheetPrimitive.Overlay` with the design system `Dialog` scrim, without its transition:
      `fixed inset-0 z-[var(--fds-z-overlay,50)] layer-0 bg-elevation-default backdrop-blur-sm opacity-80`.
    - Panel classes: `fixed inset-y-0 z-[var(--fds-z-overlay,50)] flex h-full w-full flex-col rounded-none pt-16
      shadow-global-shadow outline-none md:w-1/2`, plus `right-0` for `side="right"` (default) or `left-0` for
      `side="left"`. `rounded-none` is Paper's documented escape hatch for a square surface.
    - Body: a `div` (`h-full overflow-y-auto px-6 pt-6`) around `children`, the scroll container callers rely on
      (`EpicForm`'s sticky footer, `EeLearnMoreSheet`'s `min-h-full`).
    - Close: after the body, so focus on open still lands on the first field, a `div`
      (`absolute right-3 top-0 z-10 flex h-16 items-center`) > `SheetPrimitive.Close asChild` > `IconButton
      priority="tertiary" aria-label={closeLabel} icon={<Icon name="x" size={16} className="text-icon-default" />}`,
      the design system `Snackbar` close.
    - Escape: `onEscapeKeyDown` first ignores an Escape whose target matches
      `[role="combobox"][aria-expanded="true"]` (`event.preventDefault()`, the caller's handler is not called), so a
      combobox that is not a Radix layer closes its own list first; otherwise it calls the caller's `onEscapeKeyDown`.
    - Props: `SheetPrimitive.Content` props without `asChild` and `title` (Paper's `title` is a header slot), plus
      `side?: 'left' | 'right'` and `closeLabel?: string` (default `'Close'`). Ref to the panel `div`,
      `displayName = 'SheetContent'`.
  - `SheetHeader`: `div`, `absolute inset-x-0 top-0 z-1 flex h-16 flex-col justify-center pl-6 pr-14
    bg-elevation-heading` (`pr-14` keeps a long title off the close button). `displayName = 'SheetHeader'`.
  - `SheetTitle`: `SheetPrimitive.Title`, `m-0 title-sm text-default-primary`, ref forwarded.
  - `SheetDescription`: `SheetPrimitive.Description`, `m-0 content-base text-default-primary` (the `Dialog`
    description), ref forwarded.
  - `SheetFooter`: `div`, `flex items-center justify-end gap-2 pb-6` (the `DialogFooter` row and the legacy
    bottom spacing). No `w-full`: as a block it fills the body, and `EpicForm`'s `-mx-xl` must widen it to the panel
    edges, not shift it left. `displayName = 'SheetFooter'`.
- `Sheet.meta.ts`: `SheetMeta`, typed `ComponentMeta` from `@filigran/design-system/meta` (type import only), on the
  model of `Popover.meta.ts`: name, description (a modal side panel: a full-height `Paper` at elevation 2 against the
  left or right edge, full width then half the viewport from `md`, a 64px heading bar, a scrolling body and a footer
  row, over the `Dialog` scrim), `status: 'beta'`, `category: 'feedback'`, `version: '0.1.0'`,
  `radixPrimitive: '@radix-ui/react-dialog'`, variants `right` and `left`, no size, two examples (a form sheet with
  header, body and footer; a `side="left"` menu with `closeLabel`), `props`, and `accessibility` with
  `wcagStatus: 'pending'`, the contrast pairs `--text-default-primary` on `--bg-elevation-default` and on
  `--bg-elevation-heading` at 4.5, and notes: Radix's modal `role="dialog"` named by `SheetTitle` and described by
  `SheetDescription`, focus trapped and returned to the trigger, Escape and an outside press close it, the close
  button comes last in the tab order and is named by `closeLabel`, Escape from an open combobox is left to it.
- `Sheet.test.tsx`: closed by default; the trigger opens a `dialog` rendered in `document.body`, named by its title and
  described by its description; the panel classes (`layer-2`, `rounded-none`, `shadow-global-shadow`, `pt-16`, the
  overlay `z`) as one constant; `right-0` by default and `left-0` with `side="left"`, as one `it.each` in array form;
  a caller's `bg-gradient-background` replaces `bg-elevation-default`; the overlay carries the scrim classes; the close
  `button` is named `Close`, or `closeLabel`, and closes the sheet; focus on open goes to the first field, not the
  close button; Escape closes it; Escape from a focused `role="combobox"` input with `aria-expanded="true"` keeps it
  open and skips the caller's `onEscapeKeyDown`, with `aria-expanded="false"` it closes; a caller's
  `onPointerDownOutside` that prevents keeps it open; `SheetHeader` and `SheetFooter` classes as constants, a
  caller's `pl-l` / `flex-row` and `pb-0` / `sm:justify-between` merge; refs reach the panel, title and description.
- `index.ts`: exports the seven parts and the `SheetContentProps` type, never the meta.

## Props mapping

Every call site imports the names from `@/components/ui/sheet` and drops them from its `@filigran/ui` or
`@filigran/ui/clients` import line (the whole line when they were the only names). Every caller class stays.

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `SheetWithPreventingDialog`: `<Sheet key open onOpenChange>`, optional `<SheetTrigger asChild>`, `<SheetContent side="right" className="layer-2" onPointerDownOutside onOpenAutoFocus>`, `<SheetHeader>` + `<SheetTitle>` + `<SheetDescription>`, children | same, without `className="layer-2"` (the `Paper` carries it); `onEscapeKeyDown={(e) => alertDialogSheetClose(e)}` added next to `onPointerDownOutside`; props unchanged | 1 wrapper, 28 usages in 27 files unchanged |
| `<Sheet open onOpenChange>` + `<SheetTrigger>` (sr-only label, `MenuIcon`) + `<SheetContent side="left" className="bg-gradient-background">` + `<SheetHeader className="flex flex-row justify-between pl-l bg-gradient-background">` + `<SheetTitle className="sr-only">`, from `@filigran/ui/clients` | same | 1 (`Header.tsx`) |
| Same with `closeLabel={t('Header.CloseMenu')}`, `<SheetHeader className="flex flex-row pl-l bg-gradient-background border-elevation-border-strong">`, visible `<SheetTitle>` | same | 1 (`PublicMobileMenuButton.tsx`) |
| `<Sheet open onOpenChange>` + `<SheetContent side="right">` + `<SheetHeader className="pl-xl">` + title, `EeBadge`, `<SheetDescription>`, from `@filigran/ui` | same; `Form`, `FormField` stay on the `@filigran/ui` line | 1 (`EeLearnMoreSheet.tsx`) |
| `<SheetFooter className="pt-2">`, `"sm:justify-between pt-2"`, `"justify-end pb-0"`, `"justify-between sm:justify-between pb-0"`, `'sm:justify-end pb-0'`, `{x ? 'sm:justify-between pb-0' : 'pt-2'}`, no class, and `EpicForm`'s sticky `"bg-elevation-background-layer-2 sticky bottom-0 -mx-xl gap-l border-t px-xl py-m sm:items-center sm:justify-between"` | same | 19 |
| `SheetClose`, `SheetOverlay`, `SheetPortal`, `side="top"` / `"bottom"`, `sheetVariants` | removed, no caller; the overlay and portal are baked into `SheetContent`, as in `Dialog` | 0 |

The 19 `SheetFooter` files, under `apps/frontend/src/components/`: `epic/EpicForm.tsx`, `organization/OrganizationForm.tsx`,
`admin/voting-round/VotableFeatureForm.tsx`, `admin/voting-round/VotingRoundForm.tsx`,
`service/[slug]/ServiceSlugOrgaForm.tsx`, `service/[slug]/UserServiceForm.tsx`, `service/ServiceForm.tsx`,
`service/form/SheetFooter.tsx`, `trials/tab/quotas/TrialsTabQuotasPlatformUpdateForm.tsx`,
`service/trial-instances/manage-users/TrialsManageUsersForm.tsx`, `admin/user/forms/UserUpdateForm.tsx`,
`admin/use-case/UseCaseForm.tsx`, `admin/user/forms/UserForm.tsx`, `admin/user/forms/admin/AdminUserUpdateForm.tsx`,
`admin/user/forms/admin/UserAdminForm.tsx` (from `@filigran/ui/clients`), `admin/solution-category/SolutionCategoryForm.tsx`,
`service/components/PlatformUpdateSheet.tsx`, `competitor/CompetitorForm.tsx`, `admin/role/RoleSheetFormFooter.tsx`.

## Files in scope

- `apps/frontend/src/components/ui/sheet/Sheet.tsx`, `Sheet.meta.ts`, `Sheet.test.tsx`, `index.ts` (new)
- `apps/frontend/src/components/ui/SheetWithPreventingDialog.tsx`, and a new `SheetWithPreventingDialog.test.tsx`:
  Escape on a clean sheet calls `setOpen(false)`; Escape after a child calls `setIsDirty(true)` (through
  `useDialogContext`) shows `DialogActions.PreventSheetTitle` and does not call `setOpen(false)`; the same for an
  outside press.
- `apps/frontend/src/components/Header.tsx`, `menu/navigation/public/PublicMobileMenuButton.tsx`,
  `service/document/one-click-deploy/EeLearnMoreSheet.tsx`, and the 19 `SheetFooter` files above (all under
  `apps/frontend/src/components/`)
- `apps/frontend/src/components/filigran-ui/components/clients/index.ts` (drop `export * from './Sheet'`)
- `apps/frontend/src/components/filigran-ui/components/clients/Sheet.tsx` (delete)
- `apps/e2e/tests/model/common.ts`: `waitForDrawerToOpen` and `waitForDrawerToClose` keep only the
  `body > [role="dialog"]` wait. Their `body > div.fixed.inset-0.z-50` overlay lookup matches nothing once the overlay
  carries `z-[var(--fds-z-overlay,50)]`, which would time out the open wait; the overlay mounts and unmounts with the
  panel, with no animation left to wait for.
- `apps/e2e/tests/model/xtm-platform-roadmap.pageModel.ts`: `fillSlackLink` presses Escape again after typing the
  link, instead of clicking the sheet title, and drops the comment about it (the issue's request; commit 9d2f3df80
  made the click).

The existing tests stay as they are and must pass: `PublicMobileMenuButton.test.tsx` (one `button` in the `dialog`,
named `Header.CloseMenu`), `EditRolePortal.test.tsx`, `EditSsoGroupRolePortal.test.tsx`, `AddRolePortal.test.tsx`,
the form tests that mock `SheetWithPreventingDialog` (`EpicForm`, `OrganizationForm`, `UseServiceFormFields`,
`TrialCancelSheet`, `PlatformUpdateSheet`), and `AutocompleteInput.test.tsx`. No other e2e locator changes: forms are
found by `body > [role="dialog"]`, which the `Paper` panel still is; no e2e test names the close button.

## Screens

The cookie banner is dismissed first, then the trial Snackbar, which covers the top of the sheet. The first screen opens the admin "Add user" form sheet (the
`SheetWithPreventingDialog` path: heading bar, fields, footer, close button, scrim over the page). The second opens the
epic creation sheet on the public roadmap, a long form with `EpicForm`'s sticky footer. The mobile menus only render
under 640px and the "learn more" panel behind a deployable resource: none is captured.

```json
[
  {
    "name": "add-user-sheet",
    "path": "/app/admin/user",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "click": "li:has-text(\"Start your 30-day free trial\") >> role=button[name=\"Close\"]" },
      { "click": "main >> role=button[name=\"Add user\"]" },
      { "waitFor": "role=dialog[name=\"Add user\"]" }
    ]
  },
  {
    "name": "epic-create-sheet",
    "path": "/app",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "click": "li:has-text(\"Start your 30-day free trial\") >> role=button[name=\"Close\"]" },
      { "click": "role=link[name=\"XTM Platform Roadmap\"]" },
      { "click": "main >> role=button[name=\"Create\"]" },
      { "waitFor": "role=dialog[name=\"Create a new epic\"]" }
    ]
  }
]
```

## Out of scope

- The callers' own classes and legacy tokens (`pl-l`, `bg-gradient-background`, `EpicForm`'s footer), the header
  menus' `MenuIcon` triggers and their content.
- `AutocompleteInput` itself: the sheet's combobox rule is what keeps its Escape (Decisions).
- `@radix-ui/react-dialog` in `apps/frontend/package.json`: the candidate imports it. The legacy theme's animation
  utilities (3708). `Form`, `AutoForm` and the other exports of `clients/` (their own items).

## Accessibility and i18n

- Unchanged: the modal `role="dialog"` named by `SheetTitle` (`sr-only` in the private header), its description, the
  focus trap and return, Escape and outside press to close, the close `button` named `Close` or `Header.CloseMenu`,
  last in the tab order.
- Gained: a dirty form sheet asks before Escape closes it, as it already did for an outside press; Escape in an open
  combobox only closes its list.
- No animation, so nothing to stop under reduced motion; the legacy slide ignored it.
- No translation key added or removed.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/ui src/components/menu src/components/service src/components/admin src/components/epic src/components/organization src/components/competitor src/components/trials src/components/filigran-ui`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `yarn workspace @xtm-hub/test_e2e lint` and `yarn workspace @xtm-hub/test_e2e format:check`
- `node ds-migration/validate.mjs ds-migration/specs/3699-sheet.md`

## Decisions

- **`Paper` inside `SheetPrimitive.Content asChild`**, as the `Popover` candidate: the panel is one element, at
  elevation 2 (`layer-2`, the layer the legacy sheet painted and that portalled panels inside it already take), with
  the `shadow-global-shadow` of `Dialog` and `Popover`. `padding={0}`: the heading bar is flush with the edges.
- **The `Dialog` scrim, the `Snackbar` close**: the design system's own answers for an overlay backdrop and for a
  labelled dismiss button with a `closeLabel`; `md` keeps the legacy 36px button in the 64px bar.
- **Anatomy kept**: the absolute 64px heading bar over a `pt-16` panel, the body as scroll container and the close
  button last are what the callers' layouts and the first-field focus depend on. Spacing moves to the design system
  scale with the same values (`px-xl`/`pt-xl`/`pb-xl` 24px → `6`, `gap-s` 8px → `2`).
- **Heading bar on `bg-elevation-heading`**: under `layer-2` it resolves to the heading layer 2, the token the legacy
  `bg-elevation-surface-heading-layer-2` stood for. **Title `title-sm`**: 16px bold on a 24px line, the legacy
  `heading-sm` size, through the design system class. **Description as `DialogDescription`**.
- **Width kept** (full, then half from `md`): the design system has no side-panel width, and the `w-overlay-*` steps
  are fixed widths for a centred dialog.
- **No animation**, as `Popover` and `Accordion`: the legacy slide came from the legacy theme's animation utilities,
  and the `Dialog` transition never plays on a Radix overlay.
- **Escape guard in `SheetWithPreventingDialog`** and **the combobox rule in `SheetContent`**, from the epic-2 review
  on the issue. Radix listens for Escape on `document` in the capture phase, before the input's own handler, so
  `AutocompleteInput` cannot stop the key; the sheet leaves an Escape from an expanded `combobox` to it instead. Radix
  comboboxes, selects and menus are layers above the sheet, which then never sees their Escape.
- **No `SheetClose`, `top` or `bottom`**: no caller, as `Accordion` dropped its `variant`.

## To validate

- The panel becomes a `Paper` at elevation 2: square corners, its subtle border and `shadow-global-shadow`, instead of
  the legacy `shadow-lg`; the scrim becomes the `Dialog` one (layer-0 at 80% with a 4px blur) instead of
  `gray-900/80`. Alternative: a borderless panel.
- Sheets appear and disappear at once instead of sliding from their edge. Alternative: a slide keyframe, which the
  design system ships for no overlay.
- The close button becomes the `Snackbar` close (a neutral 16px `x`, tertiary hover) in a 36px button. Alternative:
  the `Dialog` corner close (a 24px `x`), first in the tab order.
- The sheet description moves from 12px muted to the `Dialog` description, 14px primary (only the "learn more" panel
  shows one). Alternative: `content-compact text-default-secondary`.
- The heading bar background, light theme, moves from gray-150 to gray-200 (`bg-elevation-heading`, layer 2).
- Footers no longer stack their buttons reversed in a column under 640px: they stay one row, right-aligned.
  Alternative: keep the legacy column below `sm`.
- The width stays full, then 50% from 768px. Alternative: `w-overlay-md` (640px) or `w-overlay-lg` (960px).
- `category: 'feedback'` in the meta, next to `Dialog` and `Popover`. Alternative: `surface`.

## Deferred findings

- The close button's default `'Close'` is English: `SheetWithPreventingDialog`, the "learn more" panel and the private
  header's mobile menu pass no `closeLabel`, as the design system `Dialog` hard-codes it.
- The close button of a dirty form sheet closes it without the `DialogActions.PreventSheetTitle` prompt: it calls
  `onOpenChange` directly, while Escape and an outside press go through `alertDialogSheetClose`.
- `fillSlackLink`'s Escape stays with the slack-link field only because `AutocompleteInput` reports
  `aria-expanded="true"` with no list shown (below): fixing that bug lets the Escape reach the dirty epic sheet, so the
  step has to change with it.
- The app's `cn` is plain `twMerge`: a legacy spacing class (`pl-l`, `pl-xl`) passed to a candidate does not replace
  its design system default (`pl-6`); both stay and the stylesheet order decides.
- `SheetWithPreventingDialog` always renders a `SheetDescription`, empty for every caller, so each form sheet is
  described by an empty paragraph.
- `AutocompleteInput` sets `aria-expanded="true"` while no option matches and no list shows.
- The private mobile menu's logout entry is a `div` with `onClick`, unreachable by keyboard.
