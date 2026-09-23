import { CONTENT_TRANSLATIONS_CACHE_TAG } from '@/i18n/content-translation-overrides';
import { getAuthenticatedGraphqlClient } from '@/lib/graphql-client';
import { PublishContentTranslationDraftsDocument } from '@graphql/generated';
import { updateTag } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import publishContentTranslationDraftsAction from './publish-content-translation-drafts.actions';

vi.mock('next/cache', () => ({ updateTag: vi.fn() }));
vi.mock('@/lib/graphql-client', () => ({
  getAuthenticatedGraphqlClient: vi.fn(),
}));

const request = vi.fn();

describe('publishContentTranslationDraftsAction', () => {
  beforeEach(() => {
    request.mockResolvedValue({ publishContentTranslationDrafts: [] });
    // Only the method the action calls: the full client is not needed.
    vi.mocked(getAuthenticatedGraphqlClient).mockResolvedValue({
      request,
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedGraphqlClient>>);
  });

  it('should publish the drafts with the editor session', async () => {
    // Given
    const action = publishContentTranslationDraftsAction;

    // When
    await action();

    // Then
    expect(request).toHaveBeenCalledWith(
      PublishContentTranslationDraftsDocument
    );
  });

  it('should expire the cached overrides once the drafts are published', async () => {
    // Given
    const action = publishContentTranslationDraftsAction;

    // When
    await action();

    // Then
    expect(updateTag).toHaveBeenCalledWith(CONTENT_TRANSLATIONS_CACHE_TAG);
  });

  it('should keep the cache when publishing fails', async () => {
    // Given
    request.mockRejectedValue(new Error('FORBIDDEN_ACCESS'));

    // When
    const published = publishContentTranslationDraftsAction();

    // Then
    await expect(published).rejects.toThrow('FORBIDDEN_ACCESS');
    expect(updateTag).not.toHaveBeenCalled();
  });
});
