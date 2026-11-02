type Translator = ReturnType<typeof import('next-intl').useTranslations>;

type Translate = (key: string, values?: Record<string, unknown>) => string;

interface MockTranslationsOptions {
  /** Whether a message key exists, `false` for every key by default. */
  has?: (key: string) => boolean;
  translate?: Translate;
}

/**
 * Builds the value `useTranslations` returns in tests: a translator that gives
 * back the message key it is called with, or what `translate` returns.
 */
export const mockTranslations = ({
  has = () => false,
  translate = (key) => key,
}: MockTranslationsOptions = {}): Translator => {
  const translator: Translate = (key, values) => translate(key, values);
  return Object.assign(translator, {
    has,
    rich: translator,
  }) as unknown as Translator;
};

export const translateWithValues: Translate = (key, values) =>
  values ? `${key}:${JSON.stringify(values, Object.keys(values).sort())}` : key;
