import { Locale } from '@/i18n/config';
import { getMessage } from '@/utils/content-translation/message-overrides';

export const getStaticTranslationValue = async (
  locale: Locale,
  key: string
): Promise<string> => {
  const messages = (await import(`../../../messages/${locale}.json`)).default;
  return getMessage(messages, key) ?? '';
};
