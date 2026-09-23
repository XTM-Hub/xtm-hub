import { describe, expect, it, vi } from 'vitest';
import {
  ContentTranslationEntry,
  Locale,
} from '../../__generated__/resolvers-types';
import { ContentTranslationApp } from './content-translation.app';
import { ContentTranslationDomain } from './content-translation.domain';

describe('content-translation.app', () => {
  it('should delegate loadContentTranslationsBy to the domain with locale and keys', async () => {
    // Given
    const expected: ContentTranslationEntry[] = [
      {
        key: 'HomePage.hero.title',
        locale: Locale.En,
        value: 'Welcome',
        updated_at: new Date(),
        updater_id: null,
      },
    ];
    vi.spyOn(
      ContentTranslationDomain,
      'loadContentTranslationsBy'
    ).mockResolvedValue(expected);

    // When
    const result = await ContentTranslationApp.loadContentTranslationsBy({
      locale: Locale.En,
      keys: ['HomePage.hero.title'],
    });

    // Then
    expect(
      ContentTranslationDomain.loadContentTranslationsBy
    ).toHaveBeenCalledWith({
      locale: Locale.En,
      keys: ['HomePage.hero.title'],
    });
    expect(result).toEqual(expected);
  });

  it('should delegate upsertContentTranslationBy to the domain with the flattened input', async () => {
    // Given
    const expected: ContentTranslationEntry[] = [
      {
        key: 'HomePage.hero.title',
        locale: Locale.En,
        value: 'Updated',
        updated_at: new Date(),
        updater_id: null,
      },
    ];
    vi.spyOn(
      ContentTranslationDomain,
      'upsertContentTranslation'
    ).mockResolvedValue(expected);

    // When
    const result = await ContentTranslationApp.upsertContentTranslationBy({
      input: {
        key: 'HomePage.hero.title',
        values: [{ locale: Locale.En, value: 'Updated' }],
      },
    });

    // Then
    expect(
      ContentTranslationDomain.upsertContentTranslation
    ).toHaveBeenCalledWith('HomePage.hero.title', [
      { locale: Locale.En, value: 'Updated' },
    ]);
    expect(result).toEqual(expected);
  });

  it.each([
    'Service.Trials.PageHeader.Title',
    'Reset table',
    'Error.Server.XTM_ONE_ROLE_REQUIRED',
    'Service.Cards.opencti-free-trial.Name',
  ])(
    'should delegate upsertContentTranslationBy to the domain when the key is %s',
    async (key) => {
      // Given
      vi.spyOn(
        ContentTranslationDomain,
        'upsertContentTranslation'
      ).mockResolvedValue([]);

      // When
      await ContentTranslationApp.upsertContentTranslationBy({
        input: { key, values: [{ locale: Locale.En, value: 'Updated' }] },
      });

      // Then
      expect(
        ContentTranslationDomain.upsertContentTranslation
      ).toHaveBeenCalledWith(key, [{ locale: Locale.En, value: 'Updated' }]);
    }
  );

  it.each([
    ['a prototype segment', '__proto__.polluted'],
    ['a constructor segment', 'Service.constructor.prototype'],
    ['an empty key', ''],
    ['an empty segment', 'Service..Title'],
    ['a leading dot', '.Service'],
    ['a trailing dot', 'Service.'],
    ['a segment starting with a space', 'Service. Title'],
    ['markup characters', 'Service.<script>'],
    ['a key longer than 255 characters', `Service.${'a'.repeat(248)}`],
  ])(
    'should reject upsertContentTranslationBy when the key has %s',
    async (_label, key) => {
      // Given
      const upsertSpy = vi.spyOn(
        ContentTranslationDomain,
        'upsertContentTranslation'
      );

      // When
      const upsert = ContentTranslationApp.upsertContentTranslationBy({
        input: { key, values: [{ locale: Locale.En, value: 'Updated' }] },
      });

      // Then
      await expect(upsert).rejects.toThrow('INVALID_CONTENT_TRANSLATION_KEY');
      expect(upsertSpy).not.toHaveBeenCalled();
    }
  );
});
