---
key: 3548-file-select
issue: 3548
epic: epic-2-composites
kind: ds # ds | candidate | adoption | cleanup
legacy_symbols: [FileInput, FileInputDropZone]
target_module: "@filigran/design-system"
target_symbols: [FileSelect]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/clients/FileInput.tsx]
---

# FileInput → `@filigran/design-system` `FileSelect`

## Intent

Every visible legacy `FileInput` becomes the design system `FileSelect`, bound to react-hook-form through
`value` / `onValueChange`. The files each form submits, its accepted formats, its texts and its labels stay the
same; the one hidden `FileInput`, opened by its own button, becomes the native `<input type="file">` it wrapped.

## Props mapping

The legacy `FileInput` wrote a `FileList` into the form itself (`useFormContext().setValue`); `FileSelect` is
form-agnostic and controlled. Two helpers added to `src/utils/documents.ts`, next to `fileListCheck` and `isFile`,
do the binding everywhere: `toFileSelectValue(formValue, multiple?)` keeps the `File` instances of the form value
(a `FileList` or an array, `ExistingFile`s dropped), the first one or `null` unless `multiple`;
`fromFileSelectValue(next)` returns a `File[]`, or `undefined` when empty. The form value stays array-like (`length`,
index, `Array.from`), as `transformToFileList` already stores arrays under `z.custom<FileList>`. The legacy
`texts.dropFiles` goes with drag and drop. `allowedTypes` becomes `accept`, and `image/svg` becomes `image/svg+xml`.

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `FormItem` > `FormLabel` > `FormControl` > `<FileInput {...field} texts={{ selectFile: SelectDocument, noFile: NoDocument }} allowedTypes="image/jpeg, image/gif, image/png, image/svg" />` + `FormMessage` | `render={({ field, fieldState }) => <FileSelect label={t(sameKey)} triggerLabel={t('Service.FileForm.SelectDocument')} placeholder={t('Service.FileForm.NoDocument')} accept="image/jpeg, image/gif, image/png, image/svg+xml" name={field.name} ref={field.ref} value={toFileSelectValue(field.value)} onValueChange={(next) => field.onChange(fromFileSelectValue(next))} error={fieldState.error?.message} />}` | 2 (`ServiceForm` illustration, logo) |
| `<FileInputDropZone className="absolute inset-0 p-xl pt-[5rem]">` around the form | `<div className="absolute inset-0 p-xl pt-[5rem]">` | 1 (`ServiceForm`) |
| Same `FileInput`, under a `FormLabel` that heads a preview card | `FormItem`, `FormLabel`, preview, `FormControl`, `FormMessage` kept; inside `FormControl`, the `FileSelect` above with `aria-label={t('VotingRound.Feature.Illustration')}` instead of `label` and no `error` | 1 (`VotableFeatureForm`) |
| `<FileInput {...field} isFileNameHidden onChangeCapture={async: NewFile[] with preview, id, source_type → field.onChange} disabled texts={{ UploadLogo, NoDocument }} allowedTypes="…image/svg" />` under a `FormLabel` that heads the preview | Wrappers kept as above; `<FileSelect aria-label={t('Service.Form.LogoLabel')} triggerLabel={t('Service.Form.UploadLogo')} placeholder={t('Service.FileForm.NoDocument')} accept="image/jpeg, image/gif, image/png, image/svg+xml" disabled={same} name ref value={toFileSelectValue(field.value)} onValueChange={async (next) => …} />`: the former `onChangeCapture` body builds the same `NewFile` from `next`, then `field.onChange([newFile])`; `null` (clear) → `field.onChange([])`, as the card's delete button | 1 (`service/form/LogoField`) |
| `<FileInput multiple hidden name="images" onChangeCapture texts allowedTypes="image/jpeg, image/png" ref value />`, opened by the label's `IconButton` | Inside the kept `FormControl`: `<input type="file" className="hidden" multiple name="images" accept="image/jpeg, image/png" ref={same callback} onChange={async (e) => …} />`; `onChange` returns early on an empty selection (a cancelled picker), as the legacy did, else runs the former `onChangeCapture` body, then `field.onChange(Array.from(files))`, the value the legacy `setValue` wrote | 1 (`service/form/MultipleImagesField`) |
| `AutoFormFile`: `FormItem` > `AutoFormLabel` > `FormControl` > `<FileInput {...fieldProps} />` + tooltip + `FormMessage` | `FormItem` kept + `<FileSelect label={showLabel ? text : undefined} aria-label={showLabel ? undefined : text} required={isRequired} error={useFormField().error?.message} {...rest} multiple={Boolean(multiple)} value={toFileSelectValue(value, Boolean(multiple))} onValueChange={(next) => onChange(fromFileSelectValue(next))} />` + tooltip, as `AutoFormInput`; `rest` is `fieldProps` minus `showLabel`, `required`, `value`, `onChange`, `multiple`; default design system texts | 1 (legacy, every AutoForm `fieldType: 'file'`) |
| AutoForm `inputProps: { allowedTypes: 'application/json', multiple: 'multiple' }` | `inputProps: { accept: JSON_FILE_ACCEPT }` (`application/json, .json`) | 3 (`CustomDashboardForm`, `CustomViewForm`, `OpenctiPlaybookForm`) |
| AutoForm `inputProps: { accept: 'application/zip', multiple: 'multiple' }` | `inputProps: { accept: 'application/zip, .zip' }` | 1 (`OpenaevScenarioForm`) |
| AutoForm `inputProps: { accept: 'application/json' }` | `inputProps: { accept: JSON_FILE_ACCEPT }` | 4 (`StreamForm`, `RssFeedForm`, `TaxiiFeedForm`, `CsvFeedForm`) |

## Files in scope

- `apps/frontend/src/components/service/ServiceForm.tsx`
- `apps/frontend/src/components/admin/voting-round/VotableFeatureForm.tsx`, `VotableFeatureForm.test.tsx`
- `apps/frontend/src/components/service/form/LogoField.tsx`, `form/LogoField.test.tsx` (new), `form/MultipleImagesField.tsx`
- `apps/frontend/src/components/service/custom-dashboards/[serviceInstanceId]/CustomDashboardForm.tsx`,
  `custom-views/[serviceInstanceId]/CustomViewForm.tsx`, `opencti-playbooks/[serviceInstanceId]/OpenctiPlaybookForm.tsx`,
  `openaev-scenarios/[serviceInstanceId]/OpenaevScenarioForm.tsx`
- `apps/frontend/src/utils/documents.ts`, `documents.test.ts`
- `apps/frontend/src/components/filigran-ui/components/auto-form/fields/File.tsx`
- `apps/frontend/src/components/filigran-ui/components/clients/index.ts` (drop the `FileInput` export)
- `apps/frontend/src/components/filigran-ui/components/clients/FileInput.tsx` (delete)
- `apps/frontend/messages/{en,fr,ja}.json`: remove `Service.FileForm.DropDocuments`, `Service.Form.DropDocuments`,
  `Service.Form.UploadImage` and `Service.Form.NoImage`, whose last users go (Grep `apps/frontend` first)
- E2e: the `[accept="application/json"]` locators of `dashboard.pageModel.ts` and `integration.pageModel.ts` become
  `[accept*="application/json"]` (epic review); the others (`nth(0)`, `nth(1)`, `[accept="image/jpeg, image/png"]`)
  still match one input each, and `setInputFiles` works on `FileSelect`'s
  visually hidden input

## Screens

```json
[
  {
    "name": "custom-dashboard-create-files",
    "path": "/app",
    "steps": [
      { "click": "role=button[name=\"OpenCTI\"]" },
      { "click": "role=link[name=\"Custom Dashboards\"]" },
      { "click": "role=button[name=\"Add new dashboard\"]" },
      { "waitFor": "role=dialog" },
      { "hover": "role=dialog >> role=button[name=\"Add image\"]" }
    ],
    "clip": "role=dialog"
  },
  {
    "name": "service-pictures",
    "path": "/app/admin/service",
    "steps": [
      { "click": "role=row >> role=button[name=\"Open menu\"]" },
      { "click": "role=menuitem[name=\"Pictures\"]" },
      { "waitFor": "role=dialog" }
    ],
    "clip": "role=dialog"
  }
]
```

## Out of scope

- `FileInputWithPrevent`, `JsonFileField` and `profile/form/Picture.tsx`: native file inputs, not the legacy
  component. The other fields of these forms, the legacy `Form`, `AutoForm` and `Label` (items 3706, 3707, 3691).
- Retyping the `z.custom<FileList>` schemas, and `ExistingFile` / `NewFile`.
- The legacy `theme.css` and the `@filigran/ui` aliases.

## Accessibility and i18n

- `ServiceForm` fields are named by the design system `<label for>` with the same texts. `VotableFeatureForm` and
  `LogoField` keep their `FormLabel` (`for` the input, through `FormControl`) and add an `aria-label`, which names the
  input, the trigger and the group: the same text for `VotableFeatureForm`, the label without its
  `(Filigran logo is used by default)` disclaimer for `LogoField`. AutoForm file fields lose the ` *` suffix of their name, as in the Input spec.
- `error` sets `aria-invalid` and `aria-describedby`; `required` sets `aria-required`, never the native attribute.
- The clear control and chip delete keep the design system's English names; the rejection message is its English
  default, where the legacy showed an English `Format not accepted`. No translation key added; four removed.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/utils src/components/service src/components/admin/voting-round src/components/filigran-ui`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3548-file-select.md`

New tests: `toFileSelectValue` / `fromFileSelectValue` in `documents.test.ts` (`FileList`-like input, `ExistingFile`
dropped, single vs `multiple`, `null` → `undefined`), in `VotableFeatureForm.test.tsx` an uploaded image reaching
`handleSubmit` as `illustration_document: [file]`, and in `LogoField.test.tsx` a picked image written as one `NewFile`
(preview, `source_type` `INTERNAL`) and the clear control writing `[]`.

## Decisions

- **`FileSelect` owns label and error where the label is the field's** (Input and Textarea rule). Where the
  `FormLabel` heads a preview above the field, moving it into `FileSelect` would put it under the preview: the legacy
  wrappers stay and `aria-label` names the field.
- **Controlled binding, never `{...field}`**: `FileSelect` omits `onChange`, and `form.reset()` (`ServiceForm`) and
  AutoForm `values` must reach it. Clearing a field writes `undefined` (the default, so `fileListCheck` still fails a
  required document), except `LogoField`, which writes `[]` like its delete button.
- **`accept` is checked in JavaScript now** (`matchesAccept`: exact MIME, `type/*` or `.ext`). `image/svg`, never a
  MIME, would reject every SVG the legacy extension check let through: it becomes `image/svg+xml`. The zip field had no
  JavaScript check and Windows reports `application/x-zip-compressed`: `.zip` is added. JSON takes `.json` too (epic
  review): a file the OS reports with an empty type was rejected, where the legacy accepted it. As a side effect `.jpg` images, which the legacy substring check rejected, are accepted.
- **`MultipleImagesField` gets a native input**: its picker is invisible behind the label's `+` button and the images
  grid is the selection; a visible `FileSelect` would duplicate both. `FileInputWithPrevent` already does the same.
- **Drag and drop goes** with `FileInputDropZone`: out of the `FileSelect` contract, and broken today (both overlays
  covered the whole sheet, so every drop landed in the logo field).
- **AutoForm document fields drop `multiple: 'multiple'`**: a controlled `FileSelect` in `multiple` mode appends a
  later pick, where the legacy replaced the value, and only the first file is uploaded (`use-document-context.ts`
  `.slice(0, 1)`). Re-picking after a wrong file would silently upload the wrong one. Single mode replaces on pick and
  takes the one file that is uploaded.
- **Control names translated** (epic review, see 3545).
- **The design system adapters live in `src/utils/design-system/`** (epic review): one file per component,
  `combobox.ts` (`toComboboxOptionIds`), `date-picker.ts` (`toDatePickerValue`, `fromDatePickerChange`,
  `getDatePickerLabels`) and `file-select.ts` (`toFileSelectValue`, `fromFileSelectValue`, `getFileSelectLabels`),
  each with its test, so the AutoForm and Form items reuse them.

## To validate

- Every file field takes the design system look (36px field, `Select document` small primary trigger, paperclip,
  clear cross), next to legacy labels where the field has a preview above it.
- `ServiceForm` loses drag and drop. Alternative: a dropzone candidate in epic 3.
- `LogoField` now shows the picked file name in the field, under the preview card that already shows it, and a clear
  cross. The legacy hid the name; `FileSelect` cannot. With a stored logo or the default Filigran logo, the field
  reads `No document selected` under the preview.
- The four AutoForm document fields take one file instead of several: the one that is uploaded.
- On an existing voting round feature, picking only a new illustration now enables Validate: the legacy wrote the file
  without marking the form dirty, `field.onChange` does.
- `MultipleImagesField` no longer shows `Format not accepted` for a file outside `image/jpeg, image/png` picked through
  "All files"; the legacy showed it but added the image anyway, as both still do.

## Deferred findings

- `LogoField` and `MultipleImagesField` read each picked file to base64 before writing it, with no stale-read guard:
  clearing the logo, or picking again, while a large file is being read lets the older read write it back.
- Without `FileInputDropZone`, a file dropped on the `ServiceForm` sheet makes the browser open it and leave the form.
- `MultipleImagesField` filters formats only in the OS picker; a JavaScript check like `FileSelect`'s `accept` would
  close the "All files" path.
- `MultipleImagesField`, as the legacy: images picked together can get the same timestamp `id` (shared React key,
  deleting one deletes both), and the input value is never reset, so re-picking the same file fires nothing.
- No call site sets `FileSelect`'s `maxSize`; picked images are read whole into base64 previews.
- `FileInputWithPrevent` and `profile/form/Picture.tsx` hand-roll a file picker; `FileSelect` adoption candidates
  (epic 5).
