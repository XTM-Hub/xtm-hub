import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
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

  it('should delegate saveContentTranslationDraftBy to the domain with the flattened input', async () => {
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
      'upsertContentTranslationDraft'
    ).mockResolvedValue(expected);

    // When
    const result = await ContentTranslationApp.saveContentTranslationDraftBy({
      input: {
        key: 'HomePage.hero.title',
        values: [{ locale: Locale.En, value: 'Updated' }],
      },
    });

    // Then
    expect(
      ContentTranslationDomain.upsertContentTranslationDraft
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
    'should delegate saveContentTranslationDraftBy to the domain when the key is %s',
    async (key) => {
      // Given
      vi.spyOn(
        ContentTranslationDomain,
        'upsertContentTranslationDraft'
      ).mockResolvedValue([]);

      // When
      await ContentTranslationApp.saveContentTranslationDraftBy({
        input: { key, values: [{ locale: Locale.En, value: 'Updated' }] },
      });

      // Then
      expect(
        ContentTranslationDomain.upsertContentTranslationDraft
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
    'should reject saveContentTranslationDraftBy when the key has %s',
    async (_label, key) => {
      // Given
      const upsertSpy = vi.spyOn(
        ContentTranslationDomain,
        'upsertContentTranslationDraft'
      );

      // When
      const upsert = ContentTranslationApp.saveContentTranslationDraftBy({
        input: { key, values: [{ locale: Locale.En, value: 'Updated' }] },
      });

      // Then
      await expect(upsert).rejects.toThrow('INVALID_CONTENT_TRANSLATION_KEY');
      expect(upsertSpy).not.toHaveBeenCalled();
    }
  );

  describe('with drafts stored in the database', () => {
    const TITLE_KEY = 'ContentTranslationAppTest.title';
    const SUBTITLE_KEY = 'ContentTranslationAppTest.subtitle';

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(async () => {
      await TestHelper.contentTranslationDraft.delete();
      for (const key of [TITLE_KEY, SUBTITLE_KEY]) {
        await TestHelper.contentTranslation.delete({ key });
      }
    });

    it('should make every draft live when publishing', async () => {
      // Given
      await TestHelper.contentTranslationDraft.create({
        key: TITLE_KEY,
        locale: Locale.En,
        value: 'Draft title',
      });
      await TestHelper.contentTranslationDraft.create({
        key: SUBTITLE_KEY,
        locale: Locale.Fr,
        value: 'Sous-titre brouillon',
      });

      // When
      await ContentTranslationApp.publishContentTranslationDrafts();

      // Then
      const published = await ContentTranslationApp.loadContentTranslationsBy({
        keys: [TITLE_KEY, SUBTITLE_KEY],
      });
      expect(
        published.map(({ key, locale, value }) => ({ key, locale, value }))
      ).toEqual(
        expect.arrayContaining([
          { key: TITLE_KEY, locale: Locale.En, value: 'Draft title' },
          {
            key: SUBTITLE_KEY,
            locale: Locale.Fr,
            value: 'Sous-titre brouillon',
          },
        ])
      );
    });

    it('should overwrite the live value of a key when publishing its draft', async () => {
      // Given
      await TestHelper.contentTranslation.create({
        key: TITLE_KEY,
        locale: Locale.En,
        value: 'Live title',
      });
      await TestHelper.contentTranslationDraft.create({
        key: TITLE_KEY,
        locale: Locale.En,
        value: 'Draft title',
      });

      // When
      await ContentTranslationApp.publishContentTranslationDrafts();

      // Then
      const [published] = await TestHelper.contentTranslation.loadAll({
        key: TITLE_KEY,
        locale: Locale.En,
      });
      expect(published?.value).toBe('Draft title');
    });

    it('should leave no draft behind when publishing', async () => {
      // Given
      await TestHelper.contentTranslationDraft.create({
        key: TITLE_KEY,
        locale: Locale.En,
      });

      // When
      await ContentTranslationApp.publishContentTranslationDrafts();

      // Then
      expect(await TestHelper.contentTranslationDraft.loadAll()).toEqual([]);
    });

    it('should delete every draft without touching live values when discarding', async () => {
      // Given
      await TestHelper.contentTranslation.create({
        key: TITLE_KEY,
        locale: Locale.En,
        value: 'Live title',
      });
      await TestHelper.contentTranslationDraft.create({
        key: TITLE_KEY,
        locale: Locale.En,
        value: 'Draft title',
      });
      await TestHelper.contentTranslationDraft.create({
        key: TITLE_KEY,
        locale: Locale.Fr,
      });

      // When
      const discardedCount =
        await ContentTranslationApp.discardContentTranslationDrafts();

      // Then
      const [live] = await TestHelper.contentTranslation.loadAll({
        key: TITLE_KEY,
        locale: Locale.En,
      });
      expect({
        discardedCount,
        remainingDrafts: await TestHelper.contentTranslationDraft.loadAll(),
        liveValue: live?.value,
      }).toEqual({
        discardedCount: 2,
        remainingDrafts: [],
        liveValue: 'Live title',
      });
    });
  });
});
