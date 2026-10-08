---
key: 3545-combobox
issue: 3545
epic: epic-2-composites
kind: ds # ds | candidate | adoption | cleanup
legacy_symbols: [Combobox, ComboboxItem]
target_module: "@filigran/design-system"
target_symbols: [Combobox, ComboboxField, ComboboxInput, ComboboxControls, ComboboxClear, ComboboxTrigger, ComboboxContent, ComboboxLabel]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/clients/Combobox.tsx]
---

# Combobox → `@filigran/design-system`

## Intent

The five legacy comboboxes (a button that opens a popover with a search box) move to the design system `Combobox`,
where the user types in the field itself (RULE-02). Options, server searches, the values handed to callers, the
"All organizations" sentinel and the clear control stay the same for users.

## Props mapping

Rules shared by every row, from `SsoGroupRolePortalForm` (the app's existing design system combobox):

- **One composition**: `<Combobox<T> options value onValueChange getOptionLabel isOptionEqualToValue>` >
  `<ComboboxField><ComboboxInput placeholder /><ComboboxControls><ComboboxClear /><ComboboxTrigger /></ComboboxControls></ComboboxField>`
  + `<ComboboxContent emptyMessage listAriaLabel />`. Clear and trigger keep their default names, as in
  `SsoGroupRolePortalForm`.
- **Legacy props**: `dataTab` → `options`; `order` (the closed button's text) → `ComboboxInput placeholder`; the
  search-box `placeholder` goes (no search box in the panel); `emptyCommand` → `emptyMessage`; `keyLabel` →
  `getOptionLabel`; `keyValue` → `isOptionEqualToValue` on that key (the default is `Object.is`, and every site
  rebuilds its value object); `value` `undefined` → `null`, and `onValueChange` hands callers `next ?? undefined`.
- **Typed text only searches**: `onInputChange` now also fires on a pick, a clear and a reset (RULE-14), so a site
  that searches on the server acts only when `meta.cause === 'type'`; what it did on a pick stays in `onValueChange`.
- **No label → `labelPosition="none"`** and an `aria-label` on `ComboboxInput`, from an existing key (RULE-13);
  `listAriaLabel` takes the same text.
- **Width**: the root is `w-full`; an explicit legacy width moves to `Combobox className`. Restyling goes
  (`normal-case`, `bg-input-bg-default`, `border-none`, the check mark and the `mx-3 text-sm` option text).
- **Default substring filter** everywhere (RULE-05): the legacy one also filtered client side, on top of the server.

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `AutocompleteOrganization`: `className="w-[180px]"`, no `value`, keys `name`, `onInputChange` → `refetch({ searchTerm })`, pick → `refetch({ searchTerm: '' })` + `onValueChange` | `value={null}`, `className="w-[180px]"`, `getOptionLabel` / equality on `name` (equality on `id`); `inputValue` held in state: typing sets it and refetches, any other cause empties it, so a pick leaves the placeholder as before; no `ComboboxClear` (never a value); `aria-label` and `placeholder` `t('UserForm.AddOrganization')` | 1 wrapper, 2 callers (`UserAdminForm`, `AdminUserUpdateForm`), unchanged |
| `UserOrganizationFilter`: `className="w-[200px]"`, `ALL_ORGANIZATIONS` sentinel first, `value` found by id, keys `name`, `onInputChange` → `refetch` | `className="w-[200px]"`, `value={selectedOrganization ?? null}`, label `name`, equality on `id`, `onInputChange` gated on `type`; sentinel and `handleOnValueChange` unchanged; `aria-label` and `placeholder` `t('UserActions.Organization')` | 1 (`UserList` toolbar) |
| `CountryCombobox` inside AutoForm `fieldType`: `FormItem` > `FormLabel` > `FormControl` > `CountryCombobox` + `FormMessage`; `onInputChange={() => {}}` | `CountryCombobox` gains `label: string`, rendered as `<ComboboxLabel>` (default `top`); label and equality on `name`; the empty `onInputChange` goes. `Edit.tsx`: `FormLabel` and `FormControl` go (they named and wrapped a root that rendered no element), `FormItem` and `FormMessage` stay, `label={t('UserForm.Country')}` | 1 wrapper, 1 caller (`profile/form/Edit.tsx`) |
| `IntegrationProductVersionFilter`: `{ value, label }` options, `onInputChange={setSearch}`, `onOpenChange` clears the search on close, `renderItemAdornment` (registered icon + tooltip) | `onInputChange` → `setSearch` on `type` only; the search reset on close moves to `ComboboxInput onBlur` (review round 2); `renderOption={(option) => <span className="flex min-w-0 flex-1 items-center justify-between gap-2"><span className="truncate">{option.label}</span>{adornment}</span>}` with the adornment code moved into a local function; equality on `value`; `aria-label` `t('Service.OpenctiIntegrations.Filter.ProductVersion.Label')`, `placeholder` unchanged | 1 (public and private integration lists) |
| `AdminServiceTab`: static `{ value, label }` list, literals `'Filter by service'`, `'Choose a value'`, `'Not found'` | equality on `value`; `placeholder` and `aria-label` `t('Service.FilterByService')` (new key), `emptyMessage={t('Utils.NotFound')}`; `'Choose a value'` goes with the search box | 1 (`/app/admin/service`) |

## Files in scope

- `apps/frontend/src/components/admin/user/AutocompleteOrganization.tsx`, `UserOrganizationFilter.tsx`
- `apps/frontend/src/components/ui/country/Combobox.tsx`, `apps/frontend/src/components/profile/form/Edit.tsx`
- `apps/frontend/src/components/ui/shareable-resource/integration/IntegrationProductVersionFilter.tsx`
- `apps/frontend/src/components/service/AdminServiceTab.tsx`
- `apps/frontend/messages/{en,fr,ja}.json`: `Service.FilterByService` ("Filter by service", "Filtrer par service",
  "サービスで絞り込む")
- `apps/frontend/src/components/filigran-ui/components/clients/index.ts` (drop the `Combobox` export)
- `apps/frontend/src/components/filigran-ui/components/clients/Combobox.tsx` (delete)
- Tests that opened the field through its text (`getByText(placeholder)`, now an input `placeholder`) open it through
  `getByRole('combobox', { name })`: `UserOrganizationFilter.test.tsx` (the first case asserts the `placeholder`
  attribute instead of the text), `IntegrationProductVersionFilter.test.tsx`.
- `UserOrganizationFilter.test.tsx` gains one case: typing refetches with the typed text, and a pick never refetches
  with the option's label.
- Review round 1 additions: `UserOrganizationFilter` keeps the last resolved selection while a search result lacks it
  (otherwise the engine wipes the text being typed), with one test case; `AutocompleteOrganization` empties its text
  and resets the search on close, covered by a new `AutocompleteOrganization.test.tsx`; `Edit.tsx` passes `undefined`
  rather than `''` when no country is set; `IntegrationProductVersionFilter.test.tsx` gains one case on typing and
  picking.
- Review round 2 changes: `AutocompleteOrganization` and `IntegrationProductVersionFilter` reset their search on the
  input's blur rather than on close (`onOpenChange` goes). The panel also closes on a click inside the field and on
  Escape with focus kept, where the engine keeps the typed text; blur is when it syncs that text back.
- No e2e locator changes: `profile.pageModel` (`form` > `combobox`) and `user.pageModel` (`combobox` in the add-user
  sheet) find one `role="combobox"` element each, now the input, and pick by `option` name, which the design system
  rows keep.

## Screens

```json
[
  {
    "name": "profile-country-open",
    "path": "/app/profile",
    "steps": [{ "click": "form >> role=combobox" }, { "waitFor": "role=option" }]
  },
  {
    "name": "admin-user-organization-filter-open",
    "path": "/app/admin/user",
    "steps": [{ "click": "[role=combobox]:right-of([placeholder^=\"Search user\"])" }, { "waitFor": "role=option" }]
  },
  {
    "name": "admin-user-add-organization",
    "path": "/app/admin/user",
    "steps": [{ "click": "role=button[name=\"Add user\"]" }, { "waitFor": "role=dialog" }],
    "clip": "role=dialog"
  }
]
```

## Out of scope

- The legacy `Command`, `Popover`, `Label`, `Form` and `AutoForm` (their own items): only the `Combobox` uses move.
  The legacy `<Label>` beside `AutocompleteOrganization` stays.
- `SsoGroupRolePortalForm`, already on the design system.
- The `countries.sort` that mutates the imported JSON, and the lucide `Link2` icon of the version adornment.

## Accessibility and i18n

- Every field gains a name: the legacy `<button role="combobox">` had none (ARIA does not name a combobox from its
  content), and `FormLabel` targeted an id no element carried. Now `AddOrganization`, `Organization`, `Country`
  (label), the product version filter's label key, and `Service.FilterByService`. That is why the organization
  filter screen anchors on the search input rather than on a name.
- The design system input carries `role="combobox"`, `aria-expanded`, `aria-controls` and `aria-activedescendant`;
  options carry `aria-selected` for the selection. Focus stays in the input.
- One new key, `Service.FilterByService`, in en, fr and ja.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/admin/user src/components/ui src/components/profile src/components/service src/components/filigran-ui`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3545-combobox.md`

## Decisions

- **`Combobox`, not `Select`**: every site searches, three on the server (RULE-03); the panel lists more than 15
  options for countries and organizations.
- **`inputValue` is controlled only in `AutocompleteOrganization`**: it never holds a value, and the engine writes the
  picked label into its own text, which would stay in the field until blur. Elsewhere the engine derives the text
  from `value`, as `SsoGroupRolePortalForm` does.
- **`ComboboxItem` goes with the file**: only the legacy file used it.
- **`AdminServiceTab` copy moves to keys**: the swap rewrites the three literals anyway (two of them merge and one
  goes), and a new hard-coded `aria-label` would break the i18n rule. `'Not found'` is `Utils.NotFound` word for word.
- **Version filter named by its label key** rather than its placeholder ("OpenCTI version..."), as the Select spec
  names its filters (`UseCaseListPage.Product`).
- **Filtering follows the label**: `AdminServiceTab`'s legacy filter matched the identifier (`cmdk` `value`), so
  typing a translated service name now finds it.
- **`AppCombobox` composes the field once** (epic review): `src/components/ui/AppCombobox.tsx` renders label, field
  (chips in `multiple` mode), input, clear and trigger, and the content with `Utils.NotFound` and the label as list
  name. `label` is required, so every field has a name; `labelPosition="none"` makes it the input's `aria-label`.
  `onValueChange` is typed by `multiple` (`T | null` or `T[]`), so callers cast nothing. Every composed site uses it;
  the chips-only domains field of 3701 stays inline (no list, no controls). The design system already exports a
  `ComboboxField` part, hence the `App` prefix, as `AppSnackbars`.
- **The combobox owns its error** (epic review, one rule with Select, Input, Textarea, FileSelect and DatePicker):
  `AppCombobox` takes `error`, sets the root's error state and `aria-invalid` on the input, and renders the message in
  `ComboboxHelperText`, linked by `aria-describedby`. The legacy `FormItem` / `FormMessage` / `FormControl` around
  every combobox go; AutoForm `fieldType` fields read the error with `useFormField()`. On screen: red field border and
  the design system helper text under the field; the label no longer turns red. `EntityTypesField`,
  `UseCasesField` and `TrialsManageUsersForm`, which had no `FormMessage`, now show their error.
- **The design system control names are translated** (epic review): every name with a prop goes through next-intl, in a
  `DesignSystem` namespace in en, fr and ja, plus `Utils.Clear` and `Utils.Loading`. `AppCombobox` names its clear,
  toggle and chips list and its loading message once; `SearchField` gets `clearLabel` at every site;
  `getDatePickerLabels` and `getFileSelectLabels` (beside the date and file adapters) give every picker and file field
  its names, the file trigger and empty texts and the rejection message; `BreadcrumbNav` names its landmark. Names with
  no prop stay English, one upstream request: the combobox chip remove, the dialog corner close, the button loading
  text, the tabs scroll arrows and the colour picker panel.
- **`useKeepSelectedOptions` keeps a selection's label** (epic review, replacing three strategies):
  `src/hooks/use-keep-selected-options.ts` returns the server results followed by every selected option they lack,
  found among the options earlier searches returned or the initial ones, with no setState during render.
  `UserOrganizationFilter`, `SelectUsers` (`defaultUser` instead of a bare `defaultValue` label), the server-search
  multi-selects of 3700 and `use-trial-user-options` use it. A selection outside the current results keeps its label
  and shows as a row of the list; the raw id is the last resort only when no label was ever seen.

## To validate

- Every combobox takes the design system look: editable 36px field with chevron and clear icon buttons, no check
  mark (the selected row shows a left border), a panel at least as wide as the field and capped at 328px.
- `UserOrganizationFilter` keeps the "All organizations" row beside the new clear control, which does the same.
  Alternative: drop the sentinel row.
- `IntegrationProductVersionFilter` keeps an icon at the end of registered version rows, through `renderOption`.
  Alternative: a second line of text (`isOptionTwoLine`).
- `AutocompleteOrganization` keeps its fixed 180px and its unassociated legacy label. Alternative: a
  `ComboboxLabel` with `labelPosition="left"` (see Deferred findings).

## Deferred findings

- `AutocompleteOrganization` sits beside a legacy `<Label>` that names nothing; a `ComboboxLabel` would name the
  field. With the `Label` item (3691).
- Picking "All organizations" while no organization is filtered is a no-op, and its label stays in the field until
  blur (the engine writes the picked label while `value` stays `null`).
- The typing input now sits inside the add-user, update-user and profile forms: Enter with no highlighted option
  submits the form, as in any other field of those forms. The legacy search box lived in a portal outside the form.
- The organization searches refetch on every keystroke with no debounce, as the legacy did; `AdminServiceTab`
  already debounces its own search with `DEBOUNCE_TIME`.
- `UserOrganizationFilter` does not reset the server search when the user types and then leaves the field, so the
  list reopens narrowed to the last term until the next keystroke (legacy behaviour too).
- Design system: the panel has an anchor but no Radix trigger, so a pointerdown on the field or the chevron of an
  open panel dismisses it and the click reopens it; the chevron cannot close the panel. To raise upstream.
- Design system: `ComboboxHelperText` registers its id on mount and never unregisters it, so once an error clears the
  input keeps an `aria-describedby` to a missing id. Harmless for assistive technology; to raise upstream.
