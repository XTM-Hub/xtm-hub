---
key: 3701-tag-input
issue: 3701
epic: epic-2-composites
kind: ds # ds | candidate | adoption | cleanup
legacy_symbols: [TagInput, Tag, Delimiter, tagVariants, TagInputProps, TagInputStyleClassesProps]
target_module: "@filigran/design-system"
target_symbols: [Combobox, ComboboxLabel, ComboboxField, ComboboxChips, ComboboxInput]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/clients/tag-input/TagInput.tsx, apps/frontend/src/components/filigran-ui/components/clients/tag-input/Tag.tsx, apps/frontend/src/components/filigran-ui/components/clients/tag-input/TagList.tsx, apps/frontend/src/components/filigran-ui/components/clients/tag-input/TagPopover.tsx, apps/frontend/src/components/filigran-ui/components/clients/tag-input/Autocomplete.tsx, apps/frontend/src/components/filigran-ui/components/clients/tag-input/index.ts]
---

# TagInput → `@filigran/design-system` `Combobox`

## Intent

The legacy `TagInput` has one call site, the domains field of `OrganizationForm` (create and update organization
sheets). It becomes the contract's chips-only field: a `Combobox multiple` that accepts typed values and mounts no
panel. What users can do stays: type a domain, add it with Enter or a comma, see the error and keep the text when it is
invalid or already listed, remove a domain from its chip or with Backspace. Then the whole `tag-input/` folder goes.

## Props mapping

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `FormItem` > `FormLabel` `OrganizationForm.Domains` > `FormControl` > `<TagInput {...field} placeholder tags setTags validateTag className activeTagIndex setActiveTagIndex />` + `FormMessage` | `FormItem` and `FormMessage` stay; `FormLabel` and `FormControl` go (3700 rule). `<Combobox<string> multiple options={[]} value={field.value} onValueChange={(next) => setValue('domains', next as string[], { shouldDirty: true })} open={false} allowCustomValue createValueFromInput={(input) => input} inputValue={domainInput} onInputChange={setDomainInput}>` > `<ComboboxLabel>{t('OrganizationForm.Domains')}</ComboboxLabel>` + `<ComboboxField><ComboboxChips /><ComboboxInput ref={field.ref} onBlur={field.onBlur} placeholder={t('OrganizationForm.DomainsPlaceholder')} onKeyDown={handleDomainKeyDown} /></ComboboxField>`. No `ComboboxControls`, `ComboboxClear`, `ComboboxTrigger` or `ComboboxContent`: the legacy had no clear-all and no list | 1 (`OrganizationForm`) |
| `tags` / `setTags` state seeded from `organization.domains`, mirrored into the form with `setValue` | Gone: the form's `domains` value is the only source; `useState<Tag[]>`, the `Tag` cast and the `Tag` import go | 1 |
| `activeTagIndex` / `setActiveTagIndex` (arrow keys between tags, Delete / Backspace on the active one) | Gone: the chip row does it (RULE-08, `ArrowLeft` from the caret start, `Delete` / `Backspace` on a focused chip) | 1 |
| `validateTag={validTagDomain}`: run on Enter and `,` with the trimmed text, empty included; on `false` the text stays and `setError` shows the message | `handleDomainKeyDown(event)`: on `Enter` or `,`, validate `domainInput.trim()` with the unchanged `validTagDomain`. Rejected → `event.preventDefault()` (the engine skips its own handling, the text stays, the form is not submitted). Accepted on `,` → `preventDefault()`, `setValue('domains', [...domains, text], { shouldDirty: true })`, `setDomainInput('')`. Accepted on `Enter` → left to the engine, which adds `text` through `createValueFromInput` and empties the input | 1 |
| `className="sm:min-w-[450px]"` | Dropped: `TagInput` only forwarded `className` to its autocomplete, unused here, so it never applied | 1 |

## Files in scope

- `apps/frontend/src/components/organization/OrganizationForm.tsx`
- `apps/frontend/src/components/organization/OrganizationForm.test.tsx` (new, lean): Enter adds a valid domain as a
  chip and empties the input; a comma does the same; an invalid domain and a case-insensitive duplicate keep the typed
  text, add no chip and show their message; a chip's remove control drops the domain.
- `apps/frontend/src/components/filigran-ui/components/clients/index.ts` (drop `export * from './tag-input'`)
- Delete `apps/frontend/src/components/filigran-ui/components/clients/tag-input/` (the six files of the frontmatter)
- No e2e locator changes: `organization.pageModel.ts` clicks, fills and presses Enter on
  `getByPlaceholder('Add a domain')`, the placeholder `ComboboxInput` keeps; Enter goes through the same validation.

## Screens

```json
[
  {
    "name": "organization-create-domains",
    "path": "/app/admin/organizations",
    "steps": [
      { "click": "role=button[name=\"Create organization\"]" },
      { "waitFor": "role=dialog >> [placeholder=\"Add a domain\"]" }
    ],
    "clip": "role=dialog"
  },
  {
    "name": "organization-update-domains",
    "path": "/app/admin/organizations",
    "steps": [
      { "click": "tbody >> role=row >> nth=0 >> role=button" },
      { "click": "role=menuitem[name=\"Update\"]" },
      { "waitFor": "role=dialog >> [placeholder=\"Add a domain\"]" }
    ],
    "clip": "role=dialog"
  }
]
```

## Out of scope

- The legacy `Form`, `Sheet` (`SheetFooter`) and `Popover` (their own items); `Popover` loses two consumers only.
- `uuid` in `filigran-ui/lib/utils.ts` and the `react-easy-sort` dependency, unused once the folder goes: the cleanup
  item removes the copy and its dependencies (`package.json` is shared).
- `validTagDomain` itself: its regex, its messages and its `getValues` read stay.

## Accessibility and i18n

- The field gains a name: `ComboboxLabel` names the input, where the legacy `FormLabel` targeted an id `TagInput` never
  put on its input. The input carries `role="combobox"` and `aria-expanded="false"` (no panel can open, so the arrow
  keys keep their native meaning, RULE-11).
- The chip row is a `role="list"` named "Selected values", a single Tab stop with an `aria-live` region; each remove
  control keeps the chip's "Remove {domain}" name with `tabIndex=-1`, where the legacy one was a Tab stop.
- No new key: `OrganizationForm.Domains` and `OrganizationForm.DomainsPlaceholder` move from `FormLabel` and `TagInput`.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/organization src/components/filigran-ui`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3701-tag-input.md`

## Decisions

- **`Combobox multiple`, not a rebuilt candidate**: the contract folds tags into it (`allowCustomValue`,
  `createValueFromInput`, `ComboboxChips`) and describes the chips-only field (`open={false}` without `onOpenChange`,
  no `ComboboxContent`) in `ComboboxMeta`. RULE-07 forbids a bespoke pill, which the legacy `Tag` already became in 3534.
- **Comma and validation in `onKeyDown`**, as the issue comment asks: the engine adds only on Enter and empties the
  input whatever the form then decides; `ComboboxInput` skips its own key handling on a default-prevented event.
- **`inputValue` controlled**: the comma path must empty the text itself, and in multiple mode only the engine's own
  pick or create resets it.
- **`options={[]}`**: no suggestions exist; with the domains as options, a duplicate would match an option and the
  engine would drop the Enter silently instead of letting the validation explain it.
- **Same field composition as 3700**: `ComboboxLabel` replaces `FormLabel`, `FormControl` goes, `FormItem` and
  `FormMessage` stay, no `error` on the root; the label is not `required` since the legacy showed no `*`.
- **Enter on an empty field still shows the invalid-domain message and does not submit**, as the legacy did: changing
  that is a behaviour change, not the swap.
- **The domains field stays out of `AppCombobox`** (epic review, see 3545): chips only, with no list and no controls,
  it would only bloat the wrapper.

## To validate

- The domains field takes the design system look: chips inside a 36px field that wraps and grows, no clear-all control
  and no chevron. Alternative: add `ComboboxClear`, which the legacy did not have.
- A rejected domain shows `FormMessage` under the field but no longer turns the label red (the 3700 choice). Alternative:
  `error={Boolean(fieldState.error)}` on the root, which paints the field border instead.
- Backspace in the empty input now removes the last domain (the design system's chip row), where the legacy removed one
  only after the arrow keys had selected it; the removal stays unsaved until Validate. Alternative: block that
  Backspace in `handleDomainKeyDown`, which bends the design system's keyboard model.

## Deferred findings

- `OrganizationForm.Error.DuplicateName` says "An organization with this name already exists" for a duplicate domain;
  a dedicated message needs a new key in three locales. Pre-existing copy.
- The chip row and remove controls keep the design system's English names ("Selected values", "Remove {domain}"),
  already deferred by 3534, 3545 and 3700.
- `FormControl` no longer reaches the field, so no `aria-invalid` or `aria-describedby` to `FormMessage`; the legacy
  input had neither. With item 3706, as in 3700.
- Enter during an IME composition (`ja`) runs the validation on the partial text, as the legacy did.
- The chips-only `ComboboxInput` still announces `aria-autocomplete="list"` though no list can open; the contract
  forwards the attribute, so the field could override it. Design system default, left as shipped.
- On Enter, the form validates `domainInput.trim()` while the engine stores its own trimmed `inputValue` through
  `createValueFromInput`: they agree today, but a change in the engine's normalisation would store an unchecked value.
- Organization domains are only validated in the browser; the backend accepts any string. Pre-existing.
