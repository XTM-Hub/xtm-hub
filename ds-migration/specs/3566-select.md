---
key: 3566-select
issue: 3566
epic: epic-2-composites
kind: ds # ds | candidate | adoption | cleanup
legacy_symbols: [Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger, SelectValue]
target_module: "@filigran/design-system"
target_symbols: [Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectLabel, SelectHelperText]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/clients/Select.tsx]
---

# Select → `@filigran/design-system`

## Intent

Every single-value dropdown moves to the design system `Select` compound, which owns its label, required marker,
error state and helper text. Values, sentinels (`all`, `NO_COPY`, `NO_ROLE_VALUE`, `__other__`), placeholders,
option texts and submissions stay the same for users.

## Props mapping

Rules shared by every row, from the Textarea and Input specs:

- **The field owns its label and error.** Where the render prop gives `fieldState`, `FormItem`, `FormLabel`,
  `FormControl` and `FormMessage` go: the label becomes `<SelectLabel>` (a hand-written `*` becomes `required`), the
  root takes `error={Boolean(fieldState.error)}` and `{fieldState.error && <SelectHelperText>{fieldState.error.message}</SelectHelperText>}`
  closes the root. A trigger `aria-label` that repeated the label goes (the label names it).
- **The root renders no element**, so its label, trigger and helper sit in a plain `<div>`, or they would take the
  parent's `gap-*` / `space-y-*` apart.
- **AutoForm `fieldType` callbacks get no field state**: there `FormItem` and `FormMessage` stay, `FormLabel` becomes
  `SelectLabel`, and `FormControl` stays only where it wrapped the trigger.
- **Width**: the design system trigger is `w-fit`. Where the legacy one filled its container (its default `w-full`,
  no width given), the trigger takes `className="w-full"`; explicit widths stay as they are.
- **Unnamed triggers get `aria-label`** from an existing key (contract RULE-01; it also silences the design system's
  development warning).
- **Restyling goes**: typography, ring, border, shadow, `h-auto`, `gap-*` and background overrides on the trigger,
  content and items. The `layer-N` classes stay: they are the app's elevation bridge for the design system input
  tokens (`styles/globals.css`), and `SelectContent` is portalled out of its surface.

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `FormItem` > `FormLabel` > `FormControl` > `<Select value onValueChange>` + `<SelectTrigger aria-label>` + `<SelectValue placeholder?>` + `FormMessage` | `<div><Select value onValueChange error><SelectLabel>…</SelectLabel><SelectTrigger className="w-full"><SelectValue placeholder? /></SelectTrigger><SelectContent>…</SelectContent>{helper}</Select></div>`; `render` destructures `fieldState` | 4 (`VotingRoundForm` service instance, theme, copy features with `NO_COPY`; `VotableFeatureForm` product) |
| `EpicFieldLabel required` + `<Select>` > `FormControl` > `SelectTrigger` + `FormMessage` | Same, `<SelectLabel required>{t('Epic.Form.Timeline')}</SelectLabel>` | 1 (`EpicForm` timeline) |
| `FormLabel` + `<span className="text-destructive">*</span>` + `<SelectTrigger className="layer-2">` + `<SelectContent className="layer-2">` + `FormMessage className="text-destructive"` | Same, `SelectLabel required`, trigger `cn('w-full', selectLayerClassName)`, content `selectLayerClassName`; `selectTriggerClassName` and `selectContentClassName` go | 1 (`XtmPlatformTrialForm` region) |
| `TranslatableEnumSelectField`: `FormItem` + `FormLabel` with `*` styled by `className` + `Select` + `FormMessage className` | Same pattern; props drop `className`, gain `error?: string`; trigger `cn('w-full', selectClassName)`; the 3 callers pass `error={fieldState.error?.message}` | 1 wrapper, 3 callers |
| AutoForm `fieldType`: `FormItem` > `FormLabel` with `*` > `FormControl` > `<Select onValueChange value defaultValue>` + `FormMessage` | `FormItem` > `<div><Select …same><SelectLabel required>…</SelectLabel><SelectTrigger className="w-full">…</Select></div>` + `FormMessage`; `FormControl` goes (it wrapped the root, which renders nothing) | 1 (`CompetitorForm` tier) |
| AutoForm `fieldType`: `FormItem hidden` > `FormLabel` + `<Select disabled onValueChange defaultValue>` > `FormControl` > `SelectTrigger` + `FormMessage` | `FormItem hidden` > `<div><Select …same><SelectLabel>…</SelectLabel><FormControl><SelectTrigger className="w-full">…</FormControl>…</Select></div>` + `FormMessage` | 1 (`UploaderOrganizationIdField`) |
| `SelectWithEditableField`: no label (callers' `FormLabel` with `*`), `<SelectTrigger className={layer}>` + hand-rolled placeholder `<span className="text-muted-foreground">`, custom "Other" row `div` with `pl-8` and a `CheckIcon`, `Input` row `pl-8` | `labels` gains `label`, props gain `required?`; `<div><Select …same><SelectLabel required>{labels.label}</SelectLabel><SelectTrigger className={cn('w-full', layerClassName)}><SelectValue placeholder={labels.placeholder}>{triggerText}</SelectValue></SelectTrigger>…`; the "Other" and `Input` rows align on the design system item (`border-l-2 border-transparent pl-4 pr-2`, `min-h-8`, `content-compact` typography and colour, `hover:bg-input-hover hover:border-input-hover`, and `bg-input-hover border-input-focus` instead of the `CheckIcon` when selected); callers drop `FormLabel`, pass `label` and `required`, keep `FormItem` and `FormMessage` | 1 wrapper, 2 callers (`TrialCancelSheet`, `BundleCancelSheet`) |
| `RoleSelect`: `cn('content-body-base', triggerClassName)`, content `layer-2 bg-input-default`, items `focus:bg-input-hover content-body-base`; panel caller wraps it in `FormLabel` + `FormControl` | Props gain exactly one of `label` (rendered as `SelectLabel`) or `aria-label`, root in a `<div>`; trigger `triggerClassName` only, content `layer-2`, items without `className`. Table cell: `aria-label={title}`, `triggerClassName="w-[200px] layer-0"`. Panel: `label={title}`, `triggerClassName="w-full layer-2"`, `FormLabel` and `FormControl` go, `FormItem` and the mixed-roles `<p>` stay | 1 wrapper, 2 callers (`ManageTrialTable`, `TrialUserRolePanelFields`) |
| Visible `<span>` label + `<SelectTrigger aria-label>` + `SelectValue placeholder` | Same, trigger `className="w-full"` | 2 (`Preferences` theme, language) |
| `<SelectTrigger>` after a "Sort by" `<span>` in a flex row | `<SelectTrigger aria-label={t('SortControls.SortBy')}>`, intrinsic width | 1 (`SortControls`) |
| Filter `<SelectTrigger className="w-45">` / `"w-full sm:w-45"` + `all` sentinel | Same classes + `aria-label={t('UseCaseListPage.Product')}` / `t('SolutionCategory.ListPage.Product')` | 2 (`UseCases`, `SolutionCategoryProductFilter`) |
| `<SelectTrigger className="w-56">` + items with a platform icon and a truncated title | Same JSX + `aria-label={t('ProductPlaceholder')}` | 1 (`LastDeployedResourcesClient`) |
| `AutoFormEnum`: Radix `Select` root + legacy parts | Design system `Select` and parts; trigger `cn('w-full', className)` and `aria-label={fieldConfigItem?.label \|\| label}`; the rest unchanged | 1 (legacy, every AutoForm enum: `ConnectFromHubForm` product, integration forms `license_type`) |

## Files in scope

- `apps/frontend/src/components/admin/voting-round/VotingRoundForm.tsx`, `VotableFeatureForm.tsx`
- `apps/frontend/src/components/epic/EpicForm.tsx`, `competitor/CompetitorForm.tsx`
- `apps/frontend/src/components/service/trial-instances/xtm-platform-trial/request-form/XtmPlatformTrialForm.tsx`
- `apps/frontend/src/components/ui/TranslatableEnumSelectField.tsx`, `ui/SortControls.tsx`
- `apps/frontend/src/components/service/form/UploaderOrganizationIdField.tsx`
- `apps/frontend/src/components/service/registration/SelectWithEditableField.tsx`
- `apps/frontend/src/components/service/trial-instances/TrialCancelSheet.tsx`, `xtm-platform-trial/shared/BundleCancelSheet.tsx`
- `apps/frontend/src/components/service/trial-instances/xtm-platform-trial/manage-trial/RoleSelect.tsx`, `ManageTrialTable.tsx`, `TrialUserRolePanelFields.tsx`
- `apps/frontend/src/components/profile/form/Preferences.tsx`
- `apps/frontend/src/components/admin/use-case/UseCases.tsx`, `admin/solution-category/SolutionCategoryProductFilter.tsx`
- `apps/frontend/src/components/homepage/last-deployed-resources/LastDeployedResourcesClient.tsx`
- `apps/frontend/src/components/filigran-ui/components/auto-form/fields/Enum.tsx`
- `apps/frontend/src/components/filigran-ui/components/clients/index.ts` (drop the `Select` export)
- `apps/frontend/src/components/filigran-ui/components/clients/Select.tsx` (delete)
- Tests that mock the legacy `Select` from `@filigran/ui` move the mock to `@filigran/design-system` (spreading the
  actual module): `TranslatableEnumSelectField`, `SolutionCategoryProductFilter`, `SelectWithEditableField`,
  `Preferences`, `XtmPlatformTrialForm`. `TranslatableEnumSelectField.test.tsx` loses the asterisk `className` case
  with the prop and gains one case for `error` (message shown); `SelectWithEditableField.test.tsx` passes `labels.label`.
- Tests that found a role select through its `<label>` element (the design system label is a `div`) find it by
  accessible name instead: `manage-trial/TrialUserRolePanelFields.test.tsx`, `AddTrialUserForm.test.tsx`,
  `EditTrialUsersForm.test.tsx`, `ManageTrialHeader.test.tsx`, `RoleSelect.test.tsx` (which also passes a name).
- `XtmPlatformTrialForm.test.tsx` gains one case: an empty submit shows the select fields' errors, now passed by each
  caller.
- No e2e locator changes: `combobox` names `Timeline` (substring) and `Language` (aria-label) still match, and the
  trial form finds its selects by placeholder text, which stays in the trigger.

## Screens

```json
[
  {
    "name": "voting-round-form",
    "path": "/app/admin/voting-rounds",
    "steps": [{ "click": "role=button[name=\"Create voting round\"]" }, { "waitFor": "role=dialog" }],
    "clip": "role=dialog"
  },
  {
    "name": "trial-request-form",
    "path": "/app/service/xtm-platform-trial",
    "steps": [{ "click": "role=button[name=\"Accept all\"]" }, { "waitFor": "role=combobox >> nth=0" }],
    "clip": "form:has([role=\"combobox\"])"
  },
  {
    "name": "profile-language-open",
    "path": "/app/profile",
    "steps": [{ "click": "role=combobox[name=\"Language\"]" }, { "waitFor": "role=listbox" }]
  }
]
```

## Out of scope

- The legacy `Form`, `AutoForm`, `Label`, `Combobox` and `MultiSelect` (items 3706, 3707, 3691, …): only their
  `Select` parts move. `EpicFieldLabel` stays for the fields that still use it.
- `AutoFormEnum`'s hard-coded `'Select an option'` fallback and its `AutoFormLabel` / `FormMessage` composition.
- The `layer-N` mechanism, the legacy `theme.css`, the `@filigran/ui` aliases and the `@radix-ui/react-select`
  dependency (cleanup item).

## Accessibility and i18n

- Labelled triggers are named through `aria-labelledby` on the `SelectLabel`; the required `*` is `aria-hidden`, so
  `'Timeline *'` becomes `'Timeline'` (the e2e locator matches by substring). Names given by `aria-label` stay.
- Triggers with no name before (`SortControls`, `UseCases`, `SolutionCategoryProductFilter`,
  `LastDeployedResourcesClient`, `RoleSelect`, `SelectWithEditableField`, `AutoFormEnum`) get one from an existing key
  or the visible label text; `error` links `SelectHelperText` through `aria-describedby`.
- No new translation key.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/admin src/components/epic src/components/competitor src/components/service src/components/ui src/components/profile src/components/homepage src/components/registration src/components/filigran-ui`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3566-select.md`

## Decisions

- **The design system field owns its label and error**, as for `Textarea` and `Input`. The installed `Select`
  (`dist/components/select/Select.mjs`) names the trigger from a `SelectLabel` sibling by context, takes `error` on the
  root only, and links `SelectHelperText` by `aria-describedby`; a `FormLabel` outside the root names nothing, since
  the legacy `FormControl` mostly wrapped the root, which renders no element.
- **No `aria-invalid` is added**: the design system trigger does not derive it from `error`, and only the two triggers
  wrapped in `FormControl` had it (`EpicForm` timeline, which always holds a value, and `UploaderOrganizationIdField`,
  which keeps its `FormControl`).
- **`SelectValue` with children** replaces `SelectWithEditableField`'s hand-rolled placeholder: Radix shows
  `placeholder` while the value is empty and the children otherwise, exactly the legacy condition, with the design
  system placeholder colour instead of `text-muted-foreground`.
- **The "Other" row stays a plain row**, not a `SelectItem`: picking it must keep the list open and focus the input.
- **`RoleSelect` table width** keeps its `w-[200px]`; the other overrides of that cell go.
- **`TranslatableEnumSelectField` loses `className`**: no caller passes it, and its only target, the hand-written
  asterisk, is now the design system's.
- **An AutoForm adapter only changes its import**, plus what keeps it from breaking: `AutoFormEnum` takes the design
  system root, a full-width trigger and a name.
- **`Preferences` names its selects with `SelectLabel`** (epic review), like every other labelled select: the visible
  `Theme` and `Language` labels become the triggers' names, replacing the `<span>` and the duplicated `aria-label`.

## To validate

- Every select takes the design system look: 36px outlined trigger with a chevron, no check mark (the selected item
  shows a left border), list capped at five rows with no visible scrollbar (see Deferred findings), label typography,
  required colour.
  Neighbouring legacy fields keep `FormLabel` / `FormMessage` until their item.
- `SortControls` hugs its content instead of stretching across the row (contract: width is the consumer's, and the
  flex row has no track width). Alternative: a `flex-1` track around it.
- `LastDeployedResourcesClient` keeps an icon in each item, which the contract lists as outside the design (item
  icons). Alternative: drop the icons. Its trigger is named by the "Select a product" placeholder key. Alternative: a
  new `Product` key in en, fr and ja.
- `SelectWithEditableField`'s "Other" row mimics the design system item. Both cancel sheets pass five reasons, which
  fill the five-row list, so the "Other" row and its input always start below the fold and need a scroll. Alternative:
  propose an editable option upstream, or put "Other" first.
- `RoleSelect` in the manage-trials table drops its borderless, ringless trigger for the design system one. In the
  edit-users panel, `content-body-compact-medium text-text-default-secondary` on the label goes.
- `CompetitorForm`, `UploaderOrganizationIdField` and the two cancel sheets keep the legacy `FormMessage` under a
  design system label, because AutoForm `fieldType` gets no field state. Alternative: wait for 3707.

## Deferred findings

- Upstream: the design system `SelectTrigger` does not set `aria-invalid` from the root's `error`, unlike `Input` and
  `Textarea`. A design system request.
- AutoForm `fieldType` callbacks receive `field` but not `fieldState`, which forces the legacy `FormMessage` beside the
  design system label. To settle with item 3707.
- Upstream: the design system viewport's `scrollbar-thin-input` utility sits in `@layer utilities`, and Radix injects
  an unlayered `[data-radix-select-viewport]{scrollbar-width:none}` rule that wins, so a list longer than five rows
  shows no scrollbar and no scroll buttons (trial form job title, activity sector). A design system request.
- `AutoFormEnum`'s `FormControl` wraps the root, which renders no element, so its `id`, `aria-describedby` and
  `aria-invalid` reach no node (the legacy Radix root was the same). To settle with item 3707.
- `ManageTrialTable` names every role trigger of a column with the column title; a name with the row's user would tell
  them apart. An accessibility improvement for a later epic.
