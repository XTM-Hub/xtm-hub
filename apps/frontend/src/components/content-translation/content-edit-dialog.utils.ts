import type {
  ContentKeyValues,
  EditableTranslationValue,
} from '@/hooks/use-content-translation-api';
import { Locale, locales } from '@/i18n/config';

export type EditableTextFormValues = Record<Locale, string>;

// Never seed the form with rendered text: saving its resolved placeholders or
// plural branches back would freeze them for every page sharing the key.
export const buildEditFormValues = (
  templates: EditableTranslationValue[],
  { published, drafts }: ContentKeyValues
): EditableTextFormValues => {
  const valueFor = (locale: Locale) =>
    [drafts, published, templates]
      .map((values) => values.find((entry) => entry.locale === locale))
      .find((entry) => entry !== undefined)?.value ?? '';

  return { en: valueFor('en'), fr: valueFor('fr'), ja: valueFor('ja') };
};

// Only the locales actually edited become drafts: saving an untouched locale
// would pin its current value and shadow later changes to the template.
export const pickChangedValues = (
  values: EditableTextFormValues,
  initialValues: EditableTextFormValues
): EditableTranslationValue[] =>
  locales
    .filter((locale) => values[locale] !== initialValues[locale])
    .map((locale) => ({ locale, value: values[locale] }));

export const getOriginalValues = (
  templates: EditableTranslationValue[],
  { published, drafts }: ContentKeyValues
): Partial<Record<Locale, string>> =>
  Object.fromEntries(
    templates
      .filter(
        ({ locale, value }) =>
          value !== '' &&
          [...published, ...drafts].some((entry) => entry.locale === locale)
      )
      .map(({ locale, value }) => [locale, value])
  );
