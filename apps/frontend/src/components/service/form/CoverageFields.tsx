import { useCoverageObjectTypes } from '@/components/service/form/UseCoverageObjectTypes';
import {
  Checkbox,
  FormControl,
  FormItem,
  FormLabel,
  MultiSelectFormField,
  Tag,
  TagInput,
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

export const ServiceFormCoveredObjectTypesField = ({
  field,
  disabled,
  inferred = false,
  inferredEmpty = false,
}: CoveredObjectTypesFieldProps) => {
  const t = useTranslations();
  const objectTypes = useCoverageObjectTypes();
  return (
    <FormItem>
      <FormLabel>{t('Service.Form.CoveredObjectTypesLabel')}</FormLabel>
      {inferred && (
        <p
          className="text-sm txt-sub-content"
          data-testid="coverage-inferred-note">
          {inferredEmpty
            ? t('Service.Form.CoverageInferredEmptyNote')
            : t('Service.Form.CoverageInferredNote')}
        </p>
      )}
      <FormControl>
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
      <p className="text-sm txt-sub-content">
        {t('Service.Form.CoverageDescription')}{' '}
        {t('Service.Form.CoverageLimit', { max: MAX_COVERAGE_VALUES })}
      </p>
    </FormItem>
  );
};

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

/** Sectors and regions are open lists: free text tags, matched case-insensitively by the catalog search. */
export const ServiceFormCoverageTagsField = ({
  field,
  disabled,
  family,
}: CoverageTagsFieldProps) => {
  const t = useTranslations();
  const labelKey =
    family === 'sectors'
      ? 'Service.Form.CoveredSectorsLabel'
      : 'Service.Form.CoveredRegionsLabel';
  const placeholderKey =
    family === 'sectors'
      ? 'Service.Form.CoveredSectorsPlaceholder'
      : 'Service.Form.CoveredRegionsPlaceholder';
  const [tags, setTags] = useState<Tag[]>(
    ((field.value as string[] | undefined) ?? []).map((text) => ({
      id: text,
      text,
    }))
  );
  const [activeTagIndex, setActiveTagIndex] = useState<number | null>(null);

  return (
    <FormItem>
      <FormLabel>{t(labelKey)}</FormLabel>
      <FormControl>
        <TagInput
          {...field}
          disabled={disabled}
          placeholder={t(placeholderKey)}
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
            const bounded = (newTags as Tag[]).slice(0, MAX_COVERAGE_VALUES);
            setTags(bounded);
            field.onChange(bounded.map((tag) => tag.text.trim()));
          }}
        />
      </FormControl>
      <p className="text-sm txt-sub-content">
        {t('Service.Form.CoverageLimit', { max: MAX_COVERAGE_VALUES })}
      </p>
    </FormItem>
  );
};
