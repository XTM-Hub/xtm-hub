type Translator = ReturnType<typeof import('next-intl').useTranslations>;

interface MockTranslationsOptions {
  /** Whether a message key exists, `false` for every key by default. */
  has?: (key: string) => boolean;
}

/**
 * Builds the value `useTranslations` returns in tests: a translator that gives
 * back the message key it is called with.
 */
export const mockTranslations = ({
  has = () => false,
}: MockTranslationsOptions = {}): Translator =>
  Object.assign((key: string) => key, {
    has,
    rich: (key: string) => key,
  }) as unknown as Translator;
