import { afterEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import { Locale } from '../../__generated__/resolvers-types';
import { ContentTranslationDomain } from './content-translation.domain';

describe('content-translation.domain', () => {
  const testKeyPrefix = 'ContentTranslationDomainTest';

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
    const result = await ContentTranslationDomain.upsertContentTranslation(
      `${testKeyPrefix}.title`,
      [{ locale: Locale.En, value: 'Created value' }]
    );
    const savedRows = await TestHelper.contentTranslation.loadAll({
      key: `${testKeyPrefix}.title`,
    });

    // Then
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      key: `${testKeyPrefix}.title`,
      locale: 'en',
      value: 'Created value',
    });
    expect(savedRows).toHaveLength(1);
  });

  it('should update the value when a content translation already exists for the key/locale pair', async () => {
    // Given
    await TestHelper.contentTranslation.create({
      key: `${testKeyPrefix}.title`,
      locale: Locale.En,
      value: 'Old value',
    });

    // When
    const result = await ContentTranslationDomain.upsertContentTranslation(
      `${testKeyPrefix}.title`,
      [{ locale: Locale.En, value: 'New value' }]
    );
    const savedRows = await TestHelper.contentTranslation.loadAll({
      key: `${testKeyPrefix}.title`,
      locale: Locale.En,
    });

    // Then
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ value: 'New value' });
    expect(savedRows).toHaveLength(1);
    expect(savedRows[0]).toMatchObject({ value: 'New value' });
  });

  it('should upsert several locales for the same key in a single call', async () => {
    // When
    const result = await ContentTranslationDomain.upsertContentTranslation(
      `${testKeyPrefix}.title`,
      [
        { locale: Locale.En, value: 'Hello' },
        { locale: Locale.Fr, value: 'Bonjour' },
        { locale: Locale.Ja, value: 'こんにちは' },
      ]
    );
    const savedRows = await TestHelper.contentTranslation.loadAll({
      key: `${testKeyPrefix}.title`,
    });

    // Then
    expect(result).toHaveLength(3);
    expect(savedRows).toHaveLength(3);
  });
});
