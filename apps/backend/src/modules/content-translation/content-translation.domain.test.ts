import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  requestContextSimpleUserFiligran2,
  TEST_ORGANIZATIONS,
} from '../../../tests/tests.const';
import { Locale } from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import { UnknownErrorCode } from '../../utils/error/error.code';
import { ContentTranslationDomain } from './content-translation.domain';

describe('content-translation.domain', () => {
  const testKeyPrefix = 'ContentTranslationDomainTest';
  const EDITOR_ID = requestContextSimpleUserFiligran2.user.id;
  const PREVIOUS_EDITOR_ID = TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID;

  beforeEach(() => {
    requestContext.set(requestContextSimpleUserFiligran2);
  });

  afterEach(async () => {
    await TestHelper.contentTranslation.delete({
      key: `${testKeyPrefix}.title`,
    });
    await TestHelper.contentTranslation.delete({
      key: `${testKeyPrefix}.subtitle`,
    });
  });

  it('should load content translations filtered by locale', async () => {
    // Given
    await TestHelper.contentTranslation.create({
      key: `${testKeyPrefix}.title`,
      locale: Locale.En,
      value: 'Hello',
    });
    await TestHelper.contentTranslation.create({
      key: `${testKeyPrefix}.title`,
      locale: Locale.Fr,
      value: 'Bonjour',
    });

    // When
    const result = await ContentTranslationDomain.loadContentTranslationsBy({
      locale: Locale.En,
      keys: [`${testKeyPrefix}.title`],
    });

    // Then
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      key: `${testKeyPrefix}.title`,
      locale: 'en',
      value: 'Hello',
    });
  });

  it('should load content translations filtered by keys, across all locales', async () => {
    // Given
    await TestHelper.contentTranslation.create({
      key: `${testKeyPrefix}.title`,
      locale: Locale.En,
      value: 'Hello',
    });
    await TestHelper.contentTranslation.create({
      key: `${testKeyPrefix}.title`,
      locale: Locale.Fr,
      value: 'Bonjour',
    });
    await TestHelper.contentTranslation.create({
      key: `${testKeyPrefix}.subtitle`,
      locale: Locale.En,
      value: 'Subtitle',
    });

    // When
    const result = await ContentTranslationDomain.loadContentTranslationsBy({
      keys: [`${testKeyPrefix}.title`],
    });

    // Then
    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ locale: 'en', value: 'Hello' }),
        expect.objectContaining({ locale: 'fr', value: 'Bonjour' }),
      ])
    );
  });

  it('should insert a new content translation when the row does not exist yet', async () => {
    // When
    const result = await ContentTranslationDomain.upsertContentTranslations([
      {
        key: `${testKeyPrefix}.title`,
        locale: Locale.En,
        value: 'Created value',
      },
    ]);
    const savedRows = await TestHelper.contentTranslation.loadAll({
      key: `${testKeyPrefix}.title`,
    });

    // Then
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      key: `${testKeyPrefix}.title`,
      locale: Locale.En,
      value: 'Created value',
      updater_id: EDITOR_ID,
    });
    expect(savedRows).toHaveLength(1);
  });

  it('should update the value and the updater when a content translation already exists for the key/locale pair', async () => {
    // Given
    await TestHelper.contentTranslation.create({
      key: `${testKeyPrefix}.title`,
      locale: Locale.En,
      value: 'Old value',
      updater_id: PREVIOUS_EDITOR_ID,
    });

    // When
    const result = await ContentTranslationDomain.upsertContentTranslations([
      { key: `${testKeyPrefix}.title`, locale: Locale.En, value: 'New value' },
    ]);
    const savedRows = await TestHelper.contentTranslation.loadAll({
      key: `${testKeyPrefix}.title`,
      locale: Locale.En,
    });

    // Then
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      value: 'New value',
      updater_id: EDITOR_ID,
    });
    expect(savedRows).toHaveLength(1);
    expect(savedRows[0]).toMatchObject({
      value: 'New value',
      updater_id: EDITOR_ID,
    });
  });

  it('should upsert several keys and locales in a single call', async () => {
    // When
    const result = await ContentTranslationDomain.upsertContentTranslations([
      { key: `${testKeyPrefix}.title`, locale: Locale.En, value: 'Hello' },
      { key: `${testKeyPrefix}.title`, locale: Locale.Fr, value: 'Bonjour' },
      {
        key: `${testKeyPrefix}.subtitle`,
        locale: Locale.Ja,
        value: 'こんにちは',
      },
    ]);
    const savedRows = [
      ...(await TestHelper.contentTranslation.loadAll({
        key: `${testKeyPrefix}.title`,
      })),
      ...(await TestHelper.contentTranslation.loadAll({
        key: `${testKeyPrefix}.subtitle`,
      })),
    ];

    // Then
    expect(result).toHaveLength(3);
    expect(savedRows).toHaveLength(3);
    expect(
      savedRows.map(({ key, locale, value }) => ({ key, locale, value }))
    ).toEqual(
      expect.arrayContaining([
        { key: `${testKeyPrefix}.title`, locale: Locale.En, value: 'Hello' },
        { key: `${testKeyPrefix}.title`, locale: Locale.Fr, value: 'Bonjour' },
        {
          key: `${testKeyPrefix}.subtitle`,
          locale: Locale.Ja,
          value: 'こんにちは',
        },
      ])
    );
  });

  it('should write nothing when there is no row to upsert', async () => {
    // When
    const result = await ContentTranslationDomain.upsertContentTranslations([]);

    // Then
    expect(result).toEqual([]);
  });

  it('should refuse to upsert content translations without an authenticated user', async () => {
    // Given
    requestContext.set({});

    // When
    const upsert = ContentTranslationDomain.upsertContentTranslations([
      { key: `${testKeyPrefix}.title`, locale: Locale.En, value: 'Orphan' },
    ]);

    // Then
    await expect(upsert).rejects.toThrow(
      UnknownErrorCode.NoAsyncContextAvailableError
    );
    expect(
      await TestHelper.contentTranslation.loadAll({
        key: `${testKeyPrefix}.title`,
      })
    ).toEqual([]);
  });

  describe('drafts', () => {
    afterEach(async () => {
      await TestHelper.contentTranslationDraft.delete();
    });

    it('should save drafts without changing live values', async () => {
      // Given
      await TestHelper.contentTranslation.create({
        key: `${testKeyPrefix}.title`,
        locale: Locale.En,
        value: 'Live value',
      });

      // When
      await ContentTranslationDomain.upsertContentTranslationDraft(
        `${testKeyPrefix}.title`,
        [{ locale: Locale.En, value: 'Draft value' }]
      );

      // Then
      const [live] = await TestHelper.contentTranslation.loadAll({
        key: `${testKeyPrefix}.title`,
        locale: Locale.En,
      });
      expect(live?.value).toBe('Live value');
    });

    it('should update the draft and its updater when one already exists for the key/locale pair', async () => {
      // Given
      await TestHelper.contentTranslationDraft.create({
        key: `${testKeyPrefix}.title`,
        locale: Locale.En,
        value: 'First draft',
        updater_id: PREVIOUS_EDITOR_ID,
      });

      // When
      await ContentTranslationDomain.upsertContentTranslationDraft(
        `${testKeyPrefix}.title`,
        [{ locale: Locale.En, value: 'Second draft' }]
      );

      // Then
      const drafts = await TestHelper.contentTranslationDraft.loadAll({
        key: `${testKeyPrefix}.title`,
      });
      expect(drafts).toHaveLength(1);
      expect(drafts[0]).toMatchObject({
        value: 'Second draft',
        updater_id: EDITOR_ID,
      });
    });

    it('should load only the drafts of the given keys', async () => {
      // Given
      await TestHelper.contentTranslationDraft.create({
        key: `${testKeyPrefix}.title`,
        locale: Locale.En,
      });
      await TestHelper.contentTranslationDraft.create({
        key: `${testKeyPrefix}.subtitle`,
        locale: Locale.En,
      });

      // When
      const drafts =
        await ContentTranslationDomain.loadContentTranslationDraftsBy([
          `${testKeyPrefix}.title`,
        ]);

      // Then
      expect(drafts.map(({ key }) => key)).toEqual([`${testKeyPrefix}.title`]);
    });

    it('should return the deleted drafts when deleting them', async () => {
      // Given
      await TestHelper.contentTranslationDraft.create({
        key: `${testKeyPrefix}.title`,
        locale: Locale.En,
        value: 'Draft value',
      });

      // When
      const deleted =
        await ContentTranslationDomain.deleteContentTranslationDrafts();

      // Then
      expect(deleted).toEqual([
        expect.objectContaining({
          key: `${testKeyPrefix}.title`,
          locale: Locale.En,
          value: 'Draft value',
        }),
      ]);
    });
  });
});
