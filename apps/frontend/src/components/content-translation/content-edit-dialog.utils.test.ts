import { describe, expect, it } from 'vitest';
import {
  buildEditFormValues,
  pickChangedValues,
} from './content-edit-dialog.utils';

const EN_TEMPLATE =
  "Let's get you started with your {platformName} free trial!";
const FR_TEMPLATE = 'Démarrons votre essai gratuit de {platformName} !';
const JA_TEMPLATE = '{platformName} の無料トライアルを始めましょう!';
const PUBLISHED_EN = 'Start your {platformName} free trial today!';
const DRAFT_EN = 'Try {platformName} for free today!';

const TEMPLATES = [
  { locale: 'en' as const, value: EN_TEMPLATE },
  { locale: 'fr' as const, value: FR_TEMPLATE },
  { locale: 'ja' as const, value: JA_TEMPLATE },
];

describe('buildEditFormValues', () => {
  it('should seed every locale with its raw message template when nothing was saved yet', () => {
    // Given
    const saved = { published: [], drafts: [] };

    // When
    const formValues = buildEditFormValues(TEMPLATES, saved);

    // Then
    expect(formValues).toEqual({
      en: EN_TEMPLATE,
      fr: FR_TEMPLATE,
      ja: JA_TEMPLATE,
    });
  });

  it('should prefer the published value over the committed template when a locale was published', () => {
    // Given
    const saved = {
      published: [{ locale: 'en' as const, value: PUBLISHED_EN }],
      drafts: [],
    };

    // When
    const formValues = buildEditFormValues(TEMPLATES, saved);

    // Then
    expect(formValues).toEqual({
      en: PUBLISHED_EN,
      fr: FR_TEMPLATE,
      ja: JA_TEMPLATE,
    });
  });

  it('should prefer the pending draft over the published value when a locale has both', () => {
    // Given
    const saved = {
      published: [{ locale: 'en' as const, value: PUBLISHED_EN }],
      drafts: [{ locale: 'en' as const, value: DRAFT_EN }],
    };

    // When
    const formValues = buildEditFormValues(TEMPLATES, saved);

    // Then
    expect(formValues.en).toBe(DRAFT_EN);
  });

  it('should default a locale to an empty value when it has neither a template nor a saved value', () => {
    // Given
    const templates = [{ locale: 'en' as const, value: EN_TEMPLATE }];

    // When
    const formValues = buildEditFormValues(templates, {
      published: [],
      drafts: [],
    });

    // Then
    expect(formValues).toEqual({ en: EN_TEMPLATE, fr: '', ja: '' });
  });
});

describe('pickChangedValues', () => {
  const INITIAL_VALUES = { en: EN_TEMPLATE, fr: FR_TEMPLATE, ja: JA_TEMPLATE };

  it('should keep only the locales whose value was edited', () => {
    // Given
    const values = { ...INITIAL_VALUES, fr: 'Essayez {platformName} !' };

    // When
    const changed = pickChangedValues(values, INITIAL_VALUES);

    // Then
    expect(changed).toEqual([
      { locale: 'fr', value: 'Essayez {platformName} !' },
    ]);
  });

  it('should return nothing when no locale was edited', () => {
    // Given
    const values = { ...INITIAL_VALUES };

    // When
    const changed = pickChangedValues(values, INITIAL_VALUES);

    // Then
    expect(changed).toEqual([]);
  });
});
