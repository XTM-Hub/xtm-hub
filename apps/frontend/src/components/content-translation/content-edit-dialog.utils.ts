import type { EditableTranslationValue } from '@/hooks/use-content-translation-api';
import { Locale } from '@/i18n/config';

export type EditableTextFormValues = Record<Locale, string>;

// Only message templates ever seed the form, never the text rendered on
// screen: a rendered value has its placeholders ({platformName}) and plural
// branches already resolved, and saving it back would freeze them for every
// page sharing the key. A saved override wins over the committed template.
export const buildEditFormValues = (
  templates: EditableTranslationValue[],
  savedValues: EditableTranslationValue[]
): EditableTextFormValues => {
  const valueFor = (locale: Locale) =>
    savedValues.find((saved) => saved.locale === locale)?.value ??
    templates.find((template) => template.locale === locale)?.value ??
    '';

  return { en: valueFor('en'), fr: valueFor('fr'), ja: valueFor('ja') };
};
