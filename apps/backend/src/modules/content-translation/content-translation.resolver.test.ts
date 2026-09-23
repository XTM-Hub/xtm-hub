import { describe, expect, it, vi } from 'vitest';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
} from '../../../tests/tests.const';
import {
  ContentTranslationEntry,
  Locale,
} from '../../__generated__/resolvers-types';
import { ContentTranslationApp } from './content-translation.app';
import resolver from './content-translation.resolver';

describe('content-translation.resolver', () => {
  it('should delegate contentTranslations query to app', async () => {
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
      ContentTranslationApp,
      'loadContentTranslationsBy'
    ).mockResolvedValue(expected);

    // When
    const result = await resolver.Query!.contentTranslations!(
      {},
      { locale: Locale.En },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(
      ContentTranslationApp.loadContentTranslationsBy
    ).toHaveBeenCalledWith({
      locale: Locale.En,
    });
    expect(result).toEqual(expected);
  });

  it('should delegate upsertContentTranslation mutation to app', async () => {
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
      ContentTranslationApp,
      'upsertContentTranslationBy'
    ).mockResolvedValue(expected);
    const input = {
      key: 'HomePage.hero.title',
      values: [{ locale: Locale.En, value: 'Updated' }],
    };

    // When
    const result = await resolver.Mutation!.upsertContentTranslation!(
      {},
      { input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(
      ContentTranslationApp.upsertContentTranslationBy
    ).toHaveBeenCalledWith({
      input,
    });
    expect(result).toEqual(expected);
  });
});
