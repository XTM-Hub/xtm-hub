import { Locale } from '@/i18n/config';
import { getMessage } from '@/utils/content-translation/message-overrides';

// Resolves the committed messages/{locale}.json template for a fully-qualified
// content key (e.g. "PublicHomePage.XtmPlatform.Title"), placeholders and
// plural syntax intact — a locale that has never been edited has no DB row.
export const getStaticTranslationValue = async (
  locale: Locale,
  key: string
): Promise<string> => {
  const messages = (await import(`../../../messages/${locale}.json`)).default;
  return getMessage(messages, key) ?? '';
};
