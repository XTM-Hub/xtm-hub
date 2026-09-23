import { describe, expect, it } from 'vitest';
import { buildEditFormValues } from './content-edit-dialog.utils';

const EN_TEMPLATE =
  "Let's get you started with your {platformName} free trial!";
const FR_TEMPLATE = 'Démarrons votre essai gratuit de {platformName} !';
const JA_TEMPLATE = '{platformName} の無料トライアルを始めましょう!';
const SAVED_EN_TEMPLATE = 'Start your {platformName} free trial today!';

const TEMPLATES = [
  { locale: 'en' as const, value: EN_TEMPLATE },
  { locale: 'fr' as const, value: FR_TEMPLATE },
  { locale: 'ja' as const, value: JA_TEMPLATE },
];

describe('buildEditFormValues', () => {
  it('should seed every locale with its raw message template when nothing was saved yet', () => {
    // Given
    const savedValues: typeof TEMPLATES = [];

    // When
    const formValues = buildEditFormValues(TEMPLATES, savedValues);

    // Then
    expect(formValues).toEqual({
      en: EN_TEMPLATE,
      fr: FR_TEMPLATE,
      ja: JA_TEMPLATE,
    });
  });

  it('should prefer the saved value over the committed template when a locale was edited', () => {
    // Given
    const savedValues = [{ locale: 'en' as const, value: SAVED_EN_TEMPLATE }];

    // When
    const formValues = buildEditFormValues(TEMPLATES, savedValues);

    // Then
    expect(formValues).toEqual({
      en: SAVED_EN_TEMPLATE,
      fr: FR_TEMPLATE,
      ja: JA_TEMPLATE,
    });
  });

  it('should default a locale to an empty value when it has neither a template nor a saved value', () => {
    // Given
    const templates = [{ locale: 'en' as const, value: EN_TEMPLATE }];

    // When
    const formValues = buildEditFormValues(templates, []);

    // Then
    expect(formValues).toEqual({ en: EN_TEMPLATE, fr: '', ja: '' });
  });
});
