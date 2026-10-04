import { useCoverageObjectTypes } from '@/components/service/form/UseCoverageObjectTypes';
import {
  Checkbox,
  FormControl,
  FormItem,
  FormLabel,
  MultiSelectFormField,
  Tag,
  TagInput,
  useFormField,
} from '@filigran/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';
import { z } from 'zod';

// Same bounds as COVERAGE_MAX_VALUES and COVERAGE_MAX_VALUE_LENGTH in the backend coverage model
export const MAX_COVERAGE_VALUES = 50;
const MAX_COVERAGE_VALUE_LENGTH = 128;

// The backend keeps one value per spelling compared this way: spaces collapsed, case ignored
const coverageValueKey = (value: string) =>
  value.trim().replace(/\s+/g, ' ').toLowerCase();

/** Form schema of one coverage family (object types, sectors or regions). */
export const coverageValuesSchema = z
  .array(z.string().max(MAX_COVERAGE_VALUE_LENGTH))
  .max(MAX_COVERAGE_VALUES)
  .optional();

/** Form schema of the confirmation of an inferred coverage. */
export const coverageConfirmedSchema = z.boolean().optional();

interface CoverageFieldProps {
  field: ControllerRenderProps<FieldValues, string>;
  disabled?: boolean;
}

interface CoveredObjectTypesFieldProps extends CoverageFieldProps {
  // The current coverage of the edited integration was inferred by the Hub
  inferred?: boolean;
  // The inference found no value: there is nothing to confirm, only to declare
  inferredEmpty?: boolean;
}

const COVERAGE_VALUE_KEYS = [
  'covered_object_types',
  'covered_sectors',
  'covered_regions',
] as const;

/** Whether an integration carries at least one coverage value, inferred or declared. */
export const hasCoverageValues = (document: object | null | undefined) =>
  !!document &&
  COVERAGE_VALUE_KEYS.some((key) => {
    const values = (document as Record<string, unknown>)[key];
    return Array.isArray(values) && values.length > 0;
  });

// Rendered inside the form item: the inferred note and the guidance are the accessible description of the control
const CoveredObjectTypesControl = ({
  field,
  disabled,
  inferred = false,
  inferredEmpty = false,
}: CoveredObjectTypesFieldProps) => {
  const t = useTranslations();
  const objectTypes = useCoverageObjectTypes();
  const { error, formDescriptionId, formMessageId } = useFormField();
  const inferredNoteId = `${formDescriptionId}-inferred-note`;
  const describedBy = [
    inferred ? inferredNoteId : null,
    formDescriptionId,
    error ? formMessageId : null,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <>
      <FormLabel>{t('Service.Form.CoveredObjectTypesLabel')}</FormLabel>
      {inferred && (
        <p
          id={inferredNoteId}
          className="text-sm txt-sub-content"
          data-testid="coverage-inferred-note">
          {inferredEmpty
            ? t('Service.Form.CoverageInferredEmptyNote')
            : t('Service.Form.CoverageInferredNote')}
        </p>
      )}
      <FormControl aria-describedby={describedBy}>
        <MultiSelectFormField
          disabled={disabled}
          noResultString={t('Utils.NotFound')}
          options={objectTypes}
          keyValue="id"
          keyLabel="name"
          defaultValue={field.value ?? []}
          value={field.value ?? []}
          onValueChange={(values: string[]) =>
            field.onChange(values.slice(0, MAX_COVERAGE_VALUES))
          }
          popoverContentClassName="bg-elevation-background-layer-3"
          placeholder={t('Service.Form.CoveredObjectTypesPlaceholder')}
          variant="inverted"
        />
      </FormControl>
      <p
        id={formDescriptionId}
        className="text-sm txt-sub-content">
        {t('Service.Form.CoverageDescription')}{' '}
        {t('Service.Form.CoverageLimit', { max: MAX_COVERAGE_VALUES })}
      </p>
    </>
  );
};

export const ServiceFormCoveredObjectTypesField = (
  props: CoveredObjectTypesFieldProps
) => (
  <FormItem>
    <CoveredObjectTypesControl {...props} />
  </FormItem>
);

/**
 * Shown when the edited coverage was inferred: saving the inferred values unchanged keeps them inferred, unless the
 * administrator confirms them here.
 */
export const ServiceFormCoverageConfirmationField = ({
  field,
  disabled,
  inferred = false,
}: CoveredObjectTypesFieldProps) => {
  const t = useTranslations();
  if (!inferred) {
    return null;
  }
  return (
    <FormItem className="flex flex-row items-center gap-s space-y-0">
      <FormControl>
        <Checkbox
          checked={field.value === true}
          disabled={disabled}
          onCheckedChange={(checked) => field.onChange(checked === true)}
          data-testid="coverage-confirm"
        />
      </FormControl>
      <FormLabel className="cursor-pointer font-normal">
        {t('Service.Form.CoverageConfirmLabel')}
        <span className="txt-sub-content ml-xs">
          {t('Service.Form.CoverageConfirmHint')}
        </span>
      </FormLabel>
    </FormItem>
  );
};

interface CoverageTagsFieldProps extends CoverageFieldProps {
  family: 'sectors' | 'regions';
}

// Rendered inside the form item: the coverage limit is the accessible description of the tag input
const CoverageTagsControl = ({
  field,
  disabled,
  family,
}: CoverageTagsFieldProps) => {
  const t = useTranslations();
  const { error, formDescriptionId, formMessageId } = useFormField();
  const labelKey =
    family === 'sectors'
      ? 'Service.Form.CoveredSectorsLabel'
      : 'Service.Form.CoveredRegionsLabel';
  const placeholderKey =
    family === 'sectors'
      ? 'Service.Form.CoveredSectorsPlaceholder'
      : 'Service.Form.CoveredRegionsPlaceholder';
  // The form value is the only state: a form reset or a value set by the parent shows at once
  const tags: Tag[] = ((field.value as string[] | undefined) ?? []).map(
    (text) => ({ id: text, text })
  );
  const [activeTagIndex, setActiveTagIndex] = useState<number | null>(null);

  return (
    <>
      <FormLabel>{t(labelKey)}</FormLabel>
      <FormControl>
        <TagInput
          {...field}
          disabled={disabled}
          placeholder={t(placeholderKey)}
          // The tag input passes only these attributes on to its text field
          inputProps={{
            'aria-describedby': error
              ? `${formDescriptionId} ${formMessageId}`
              : formDescriptionId,
            'aria-invalid': !!error,
          }}
          tags={tags}
          // Commas belong to sector and region values: only Enter adds a tag
          delimiterList={['Enter']}
          validateTag={(tag: string) =>
            tags.length < MAX_COVERAGE_VALUES &&
            tag.trim().length > 0 &&
            tag.length <= MAX_COVERAGE_VALUE_LENGTH &&
            !tags.some(
              (existing) =>
                coverageValueKey(existing.text) === coverageValueKey(tag)
            )
          }
          activeTagIndex={activeTagIndex}
          setActiveTagIndex={setActiveTagIndex}
          setTags={(newTags) => {
            const next =
              typeof newTags === 'function' ? newTags(tags) : newTags;
            field.onChange(
              next
                .slice(0, MAX_COVERAGE_VALUES)
                .map((tag: Tag) => tag.text.trim())
            );
          }}
        />
      </FormControl>
      <p
        id={formDescriptionId}
        className="text-sm txt-sub-content">
        {t('Service.Form.CoverageLimit', { max: MAX_COVERAGE_VALUES })}
      </p>
    </>
  );
};

/** Sectors and regions are open lists: free text tags, matched case-insensitively by the catalog search. */
export const ServiceFormCoverageTagsField = (props: CoverageTagsFieldProps) => (
  <FormItem>
    <CoverageTagsControl {...props} />
  </FormItem>
);
