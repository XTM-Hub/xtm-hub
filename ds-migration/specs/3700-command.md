---
key: 3700-command
issue: 3700
epic: epic-2-composites
kind: ds # ds | candidate | adoption | cleanup
legacy_symbols: [Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut, MultiSelectFormField]
target_module: "@filigran/design-system"
target_symbols: [Combobox, ComboboxLabel, ComboboxField, ComboboxChips, ComboboxInput, ComboboxControls, ComboboxClear, ComboboxTrigger, ComboboxContent]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/clients/Command.tsx, apps/frontend/src/components/filigran-ui/components/clients/MultiSelect.tsx]
---

# Command → `@filigran/design-system` `Combobox`

## Intent

The legacy `Command` has two consumers, both a button that opens a popover with a search box: the legacy
`MultiSelectFormField` (16 call sites) and `ui/SelectUsers`. Both move to the design system `Combobox`, where the user
types in the field itself: `multiple` for `MultiSelectFormField`, single for `SelectUsers`, which never holds more
than one user. Options, server searches, the ids handed to forms and what each form submits stay the same for users.
Then `Command.tsx` and `MultiSelect.tsx` go.

## Props mapping

Rules shared by every `MultiSelectFormField` row:

- **One composition**: `<Combobox<string> multiple options={ids} value={selectedIds} onValueChange getOptionLabel>` >
  `[<ComboboxLabel>]` + `<ComboboxField><ComboboxChips /><ComboboxInput placeholder /><ComboboxControls><ComboboxClear /><ComboboxTrigger /></ComboboxControls></ComboboxField>`
  + `<ComboboxContent emptyMessage={t('Utils.NotFound')} listAriaLabel={label} />`. Clear, trigger and chip row keep
  their default names, as in 3545.
- **Options are the ids**: forms hold `string[]` of ids, and a server search can drop a selected id from the options,
  so `T` is the id string. A new pure helper `toComboboxOptionIds(options, getId, getLabel)` in
  `apps/frontend/src/utils/combobox-option-ids.ts` returns `{ ids, getOptionLabel }`; `getOptionLabel` falls back to
  the id, as the legacy badge did. `keyValue` / `keyLabel` (default `value` / `label`) become `getId` / `getLabel`;
  callers wrap the call in `useMemo` on the options.
- **Legacy props**: `defaultValue` and `value` → `value={field.value ?? []}`; `onValueChange` keeps its handler, `next`
  narrowed to `string[]`; `placeholder` → `ComboboxInput placeholder`; `noResultString` → `emptyMessage`;
  `shouldFilter={false}` → `filterOptions={(options) => options}`; `disabled` → `Combobox disabled`;
  `onInputChange` calls its handler unless `meta.cause === 'select'`: in multiple mode the engine empties the text on a
  pick, and searching `''` then would drop a just-picked server result and turn its chip into the raw id; a clear
  empties the selection too, so it searches `''` and leaves no stale filter.
- **The field owns its label**: `FormLabel` text → `<ComboboxLabel>` (a hand-written `*` or `EpicFieldLabel required`
  becomes `required`); `FormControl` goes, as in 3545; `FormItem` and `FormMessage` stay. No label → `labelPosition="none"`,
  `aria-label` on `ComboboxInput` from the placeholder key (RULE-13).
- **Restyling goes**: `variant`, `popoverContentClassName`, `placeholderClassName`, `bg-*` / `hover:*` / `cmdk`
  classes, `FormLabel` typography. `layer-2` stays on `ComboboxContent` where the legacy content had it.
- **Gone with the panel**: the search box, the "Clear" and "Close" rows (now `ComboboxClear`, Escape and a click outside),
  the `+N...` overflow chip and tooltip (chips wrap, contract "Out of scope").

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `FormItem` > `FormLabel` > `FormControl` > `MultiSelectFormField` static options + `FormMessage`? | Shared composition, `ComboboxLabel` from the `FormLabel` text (`required` for `EntityTypesField`, and `UseCasesField` when `required`) | 6 (`SolutionCategoryForm`, `UseCaseForm`, `SolutionCategoryField`, `UseCasesField`, `EntityTypesField`, `RolePortalForm`) |
| `EpicForm` products: `EpicFieldLabel required`, `onValueChange` → `sortFiligranProducts` | `<ComboboxLabel required>{t('Epic.Form.FiligranProduct')}</ComboboxLabel>`, handler unchanged | 1 |
| `EpicFilter`: no label, counts in labels | `labelPosition="none"`, `aria-label` and placeholder `t('Epic.FilterByProduct')` | 1 |
| Server search: `shouldFilter={false}` + debounced `onInputChange` (organizations, users) | Identity `filterOptions`, `onInputChange` handler unchanged, skipped on `select`; labels `OrganizationInServiceAction.Organization`, `InviteUserServiceForm.Email` | 2 (`ServiceSlugOrgaForm`, `UserServiceForm`) |
| `TrialUserFormSkeleton`: optional `FormLabel`, `onInputChange` / `shouldFilter={!onInputChange}`, `onValueChange` also calls `onUsersChange`, `layer-2` wrapper | `ComboboxLabel` when `pickerLabel`, else `labelPosition="none"` + `aria-label={pickerPlaceholder}`; identity `filterOptions` only when `onUsersInputChange`; the `layer-2` div stays, `ComboboxContent className="layer-2"` | 1 wrapper, 2 callers unchanged |
| `TrialsManageUsersForm`: `FormLabel` group name, `defaultValue` only | `ComboboxLabel` `group.name`, `value={value ?? []}` | 1 |
| `IntegrationsCsvExportDialog`: `className="w-full min-w-0 max-w-md whitespace-nowrap"`, `data-testid` | `Combobox className="min-w-0 max-w-md"`, `data-testid` on `ComboboxField`; the "Filters" `<Label>` stays | 2 (columns, and `IntegrationsCsvExportFilterField` × 6) |
| `CapabilityMultiSelect` (`ui/capability/MultiSelect.tsx`): no label, `onChange: () => void` | Props gain `label?: string`; without it `labelPosition="none"` + `aria-label` from `UserForm.OrganizationsCapabilitiesPlaceholder`; `onChange: (value: string[]) => void`. `UserForm`, `UserUpdateForm`: `label={t('UserForm.OrganizationCapabilities')}`, `FormLabel` and `FormControl` go. `UserAdminForm`, `AdminUserUpdateForm`: no label (the organization `<Label>` stays), `FormControl` goes | 1 wrapper, 4 callers |
| `SelectUsers`: button with one `Chip` + clear span + chevron, `Command shouldFilter={false}`, debounced search, toggle on the selected row, "Clear" / "Close" rows | Single mode: `options` `{ value, label }[]`, the selection derived from the `value` prop on every render (the form sets it after mount), labelled by the last picked user, then the loaded option, then `defaultValue`, then the id; `onValueChange={(next) => { remember the pick; onValueChange(next?.value ?? '') }}`, equality on `value`, identity `filterOptions`, search on `meta.cause === 'type'` only (3545 rule), `ComboboxClear` + `ComboboxTrigger`, placeholder `t('InviteUserServiceForm.Email')`. Props: `label`, `defaultValue`, `value`, `onValueChange`, `disabled`; no `forwardRef`, no button attributes. `UploaderIdField`: `label={t('Service.Form.Author')}`, `FormLabel` and `FormControl` go | 1 wrapper, 1 caller |

## Files in scope

- `apps/frontend/src/utils/combobox-option-ids.ts` and `.test.ts` (new)
- `apps/frontend/src/components/epic/EpicForm.tsx`, `EpicFilter.tsx`
- `apps/frontend/src/components/admin/role/RolePortalForm.tsx`, `admin/use-case/UseCaseForm.tsx`,
  `admin/solution-category/SolutionCategoryForm.tsx`
- `apps/frontend/src/components/admin/user/forms/UserForm.tsx`, `UserUpdateForm.tsx`, `admin/UserAdminForm.tsx`,
  `admin/AdminUserUpdateForm.tsx`, `apps/frontend/src/components/ui/capability/MultiSelect.tsx`
- `apps/frontend/src/components/service/form/UseCasesField.tsx`, `SolutionCategoryField.tsx`, `EntityTypesField.tsx`,
  `UploaderIdField.tsx`, `apps/frontend/src/components/ui/SelectUsers.tsx` and `SelectUsers.test.tsx` (new: a value
  the form sets after mount is displayed)
- `apps/frontend/src/components/service/[slug]/ServiceSlugOrgaForm.tsx`, `UserServiceForm.tsx`
- `apps/frontend/src/components/service/components/header/IntegrationsCsvExportDialog.tsx`
- `apps/frontend/src/components/service/trial-instances/manage-users/TrialsManageUsersForm.tsx`,
  `xtm-platform-trial/manage-trial/TrialUserFormSkeleton.tsx`
- `apps/frontend/src/components/filigran-ui/components/clients/index.ts` (drop `Command` and `MultiSelect`), delete
  `clients/Command.tsx` and `clients/MultiSelect.tsx`
- `apps/frontend/messages/{en,fr,ja}.json`: drop the `SelectUsers` namespace, unused once its clear span goes
- Unit tests that opened a field through its text or button: `SolutionCategoryField.test.tsx` (`combobox` by name,
  `placeholder` attribute, chips by text), `TrialUserFormSkeleton.test.tsx` and `AddTrialUserForm.test.tsx` (`combobox`
  by name instead of the placeholder text, type in it instead of `'Search...'`), `IntegrationsCsvExportDialog.test.tsx`
  (`Clear` is a button of the field, not a row of the list). `AddRolePortal` / `EditRolePortal` keep `getByLabelText`.
- e2e locators, page objects first:
  - `model/service.pageModel.ts`: `button` `Organization` → `combobox`; listbox `/Suggestions/` → `Organization`;
    `button` `Email` + `'Search...'` → fill `combobox` `Email`, pick by `option`, close with Escape (the second `Email`
    click goes; drop `dialog.nth(1).press('Enter')` only if that dialog was the legacy popover).
  - `tests_files/service-management.spec.ts` (`Email` / `'Search...'`, same move).
  - `model/xtm-platform-roadmap.pageModel.ts`: `Clear all selections` → the `Clear` button of that field (scope it
    to the field's `[data-combobox-root]`: the Slack link and search fields have their own `Clear`); `button` with text
    `Product` / `Filter by product` → `combobox` by exact name; a `getSelectedProductFilter(label)` helper finds the
    selected product chip, which is no longer inside a button. `fillSlackLink` closes the typed link's suggestions
    with a click on the sheet title instead of Escape, which dismissed the sheet (CI fix).
  - `tests_files/xtm-platform-roadmap.spec.ts` (the five `button` `OpenCTI (n)` assertions use that helper).
  - `model/user.pageModel.ts`: `button` `Additional capabilities` → `combobox`.
  - `model/common.ts`: `getByText('Add use cases' | 'Add solution categories')` → `combobox` `Use cases` /
    `Solution categories`.

## Screens

```json
[
  {
    "name": "custom-dashboard-create-fields",
    "path": "/app",
    "steps": [
      { "click": "role=button[name=\"OpenCTI\"]" },
      { "click": "role=link[name=\"Custom Dashboards\"]" },
      { "click": "role=button[name=\"Add new dashboard\"]" },
      { "waitFor": "role=dialog" }
    ],
    "clip": "role=dialog"
  },
  {
    "name": "epic-filter-open",
    "path": "/app",
    "steps": [
      { "click": "role=link[name=\"XTM Platform Roadmap\"]" },
      { "waitFor": "role=switch" },
      { "click": "div.grid:has([role=switch]) > div:nth-child(2)" },
      { "waitFor": "role=option" }
    ]
  },
  {
    "name": "integrations-csv-export",
    "path": "/app",
    "steps": [
      { "click": "role=button[name=\"OpenCTI\"]" },
      { "click": "role=link[name=\"Integrations\"]" },
      { "click": "role=button[name=\"Export CSV\"]" },
      { "waitFor": "role=dialog" }
    ],
    "clip": "role=dialog"
  }
]
```

## Out of scope

- The legacy `Popover`, `Separator`, `Label`, `Form`, `AutoForm`, `Sheet` and `tag-input` (their own items), and
  `LogicalMultiSelectFormField`, which uses none of `Command`.
- The `cmdk` dependency (cleanup item: `package.json` is shared).
- Server search behaviour: page sizes, debounce, the 50-first resolution of selected labels.

## Accessibility and i18n

- Every field gains a real name: the legacy button took its name from its content, or from a `FormLabel` only where
  `FormControl` reached it. Names now come from `ComboboxLabel` or `aria-label` (keys above, no new key).
- The input carries `role="combobox"`, the panel a multiselectable listbox whose options carry `aria-selected` and a
  presentational checkbox; chips are a single Tab stop. "Clear all selections" (`SelectUsers.ClearAllSelections` and
  the legacy literal) becomes the design system "Clear".

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/utils src/components/epic src/components/admin src/components/service src/components/ui src/components/filigran-ui`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `yarn workspace @xtm-hub/test_e2e lint` and `yarn workspace @xtm-hub/test_e2e format:check`
- `node ds-migration/validate.mjs ds-migration/specs/3700-command.md`

## Decisions

- **`MultiSelectFormField` moves here**: it is `Command`'s main consumer and has no item of its own; deleting
  `Command` means moving its 16 sites, and the contract folds multi-select into `Combobox multiple`.
- **Ids as options, unlike 3545's objects**: with objects, a selected id missing from a server result would vanish
  from `value` and be dropped from the form on the next pick. `isOptionEqualToValue` stays the default `Object.is`.
- **`SelectUsers` is single mode**: it stores one id, and its only caller's field is a string.
- **A pick never searches**: single mode writes the picked label into the text, so it searches on `type` only (3545);
  multiple mode empties the text, so it searches on everything but `select`, as the legacy search box kept its text
  after a pick. The results of the last search stay listed after a pick, so several can be picked from one search, and
  a clear resets the search with the selection.
- **Default substring filter** where the legacy filtered client side (RULE-05); identity where it did not.
- **The multi-selects use `AppCombobox`** (epic review, see 3545): the composition and the `as string[]` casts go.
- **The multi-selects own their error** (epic review, see 3545): `error` on `AppCombobox`, no `FormItem` /
  `FormMessage` / `FormControl`.

## To validate

- Every multi-select takes the design system look: chips in the field that wrap and grow it instead of `+N...`, a
  checkbox per row, the panel staying open on a pick, no Clear / Close rows.
- `SelectUsers` shows the author as text in the field instead of a chip, and picking the selected row keeps it
  instead of clearing it (the clear control does that). Alternative: `multiple` capped at one value.
- The CSV export filter labels lose `font-normal text-text-default-secondary`. Alternative: keep them through a class
  on `ComboboxLabel`.
- `CapabilityMultiSelect` in the admin forms is named by "Additional capabilities", the same for every organization
  row. Alternative: name each by its organization.

## Deferred findings

- The chip row ("Selected values"), clear ("Clear") and chevron ("Toggle options") keep the design system's English
  names; already deferred by 3545.
- `TrialsManageUsersForm` builds `userIds` with `options.find(...)?.value`, which can hold `undefined`; pre-existing.
- Selected ids outside the current server results show the raw id as chip label (`ServiceSlugOrgaForm`,
  `UserServiceForm`), as the legacy badges did; `use-trial-user-options.ts` keeps selected options and could be shared.
- `required` sits on `ComboboxLabel` only, so the inputs carry no `aria-required` (the root `Combobox required` sets
  it). The legacy buttons had none either; same choice as 3545 (`SsoGroupRolePortalForm`).
- `ComboboxChips` keys each chip by its label: two selected options with the same label (solution category names are
  not unique) collide. Upstream fix: key by index or `isOptionEqualToValue`.
- No unit test covers `CapabilityMultiSelect`, `ServiceSlugOrgaForm`, `UserServiceForm`, `TrialsManageUsersForm`,
  `EpicForm` products, `EpicFilter`, `EntityTypesField`, `UseCasesField`, or picking a product in `UseCaseForm` and
  `SolutionCategoryForm`; pre-existing gaps, e2e covers most of them.
- Enter in a `ComboboxInput` with no highlighted row submits the surrounding form (the engine only prevents it on a
  highlighted row), where the legacy trigger button opened the panel. Standard text-field behaviour, same as the 3545
  fields; an upstream option to swallow Enter in a combobox would restore the old guard.
- Escape that no open popover handles (a text field, `AutocompleteInput`) closes a `SheetWithPreventingDialog` and
  drops the unsaved form: it guards a click outside but not Escape. Pre-existing for every sheet built on it; the e2e
  slack link step pressed Escape there and passed with the legacy picker, likely because a legacy layer took that
  Escape (not confirmed). The step now closes the suggestions with a click on the sheet title. With item 3699.
