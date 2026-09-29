import type {
  ContentKeyValues,
  EditableTranslationValue,
} from '@/hooks/use-content-translation-api';
import { Locale, locales } from '@/i18n/config';

export type EditableTextFormValues = Record<Locale, string>;

// Only message templates ever seed the form, never the text rendered on
// screen: a rendered value has its placeholders ({platformName}) and plural
// branches already resolved, and saving it back would freeze them for every
// page sharing the key. A pending draft wins over the published override,
// which wins over the committed template.
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

// The committed template of every locale whose value comes from a draft or a
// published override, shown as the original next to the edited value.
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
