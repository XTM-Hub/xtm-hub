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

  it('should delegate saveContentTranslationDraft mutation to app', async () => {
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
      'saveContentTranslationDraftBy'
    ).mockResolvedValue(expected);
    const input = {
      key: 'HomePage.hero.title',
      values: [{ locale: Locale.En, value: 'Updated' }],
    };

    // When
    const result = await resolver.Mutation!.saveContentTranslationDraft!(
      {},
      { input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(
      ContentTranslationApp.saveContentTranslationDraftBy
    ).toHaveBeenCalledWith({
      input,
    });
    expect(result).toEqual(expected);
  });

  it('should delegate contentTranslationDrafts query to app', async () => {
    // Given
    vi.spyOn(
      ContentTranslationApp,
      'loadContentTranslationDraftsBy'
    ).mockResolvedValue([]);

    // When
    await resolver.Query!.contentTranslationDrafts!(
      {},
      { keys: ['HomePage.hero.title'] },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(
      ContentTranslationApp.loadContentTranslationDraftsBy
    ).toHaveBeenCalledWith({ keys: ['HomePage.hero.title'] });
  });

  it('should delegate publishContentTranslationDrafts mutation to app', async () => {
    // Given
    vi.spyOn(
      ContentTranslationApp,
      'publishContentTranslationDrafts'
    ).mockResolvedValue([]);

    // When
    await resolver.Mutation!.publishContentTranslationDrafts!(
      {},
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(
      ContentTranslationApp.publishContentTranslationDrafts
    ).toHaveBeenCalled();
  });

  it('should delegate discardContentTranslationDrafts mutation to app', async () => {
    // Given
    vi.spyOn(
      ContentTranslationApp,
      'discardContentTranslationDrafts'
    ).mockResolvedValue(2);

    // When
    const result = await resolver.Mutation!.discardContentTranslationDrafts!(
      {},
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(result).toBe(2);
  });
});
