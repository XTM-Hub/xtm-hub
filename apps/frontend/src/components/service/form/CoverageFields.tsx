import { useCoverageObjectTypes } from '@/components/service/form/UseCoverageObjectTypes';
import {
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

interface CoverageFieldProps {
  field: ControllerRenderProps<FieldValues, string>;
  disabled?: boolean;
}

export const ServiceFormCoveredObjectTypesField = ({
  field,
  disabled,
}: CoverageFieldProps) => {
  const t = useTranslations();
  const objectTypes = useCoverageObjectTypes();
  return (
    <FormItem>
      <FormLabel>{t('Service.Form.CoveredObjectTypesLabel')}</FormLabel>
      <FormControl>
        <MultiSelectFormField
          disabled={disabled}
          noResultString={t('Utils.NotFound')}
          options={objectTypes}
          keyValue="id"
          keyLabel="name"
          defaultValue={field.value ?? []}
          value={field.value ?? []}
          onValueChange={field.onChange}
          popoverContentClassName="bg-elevation-background-layer-3"
          placeholder={t('Service.Form.CoveredObjectTypesPlaceholder')}
          variant="inverted"
        />
      </FormControl>
      <p className="text-sm txt-sub-content">
        {t('Service.Form.CoverageDescription')}
      </p>
    </FormItem>
  );
};

// Same bound as COVERAGE_MAX_VALUE_LENGTH in the backend coverage model
const MAX_COVERAGE_VALUE_LENGTH = 128;

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
          validateTag={(tag: string) =>
            tag.trim().length > 0 && tag.length <= MAX_COVERAGE_VALUE_LENGTH
          }
          activeTagIndex={activeTagIndex}
          setActiveTagIndex={setActiveTagIndex}
          setTags={(newTags) => {
            setTags(newTags as Tag[]);
            field.onChange((newTags as Tag[]).map((tag) => tag.text.trim()));
          }}
        />
      </FormControl>
    </FormItem>
  );
};
