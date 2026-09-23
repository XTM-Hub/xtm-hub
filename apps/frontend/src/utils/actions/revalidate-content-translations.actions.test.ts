import { CONTENT_TRANSLATIONS_CACHE_TAG } from '@/i18n/content-translation-overrides';
import { isContentEditModeActive } from '@/utils/content-translation/content-edit-mode.server';
import { updateTag } from 'next/cache';
import { describe, expect, it, vi } from 'vitest';
import revalidateContentTranslationsAction from './revalidate-content-translations.actions';

vi.mock('next/cache', () => ({ updateTag: vi.fn() }));
vi.mock('@/utils/content-translation/content-edit-mode.server', () => ({
  isContentEditModeActive: vi.fn(),
}));

describe('revalidateContentTranslationsAction', () => {
  it('should expire the cached overrides when an editor publishes', async () => {
    // Given
    vi.mocked(isContentEditModeActive).mockResolvedValue(true);

    // When
    await revalidateContentTranslationsAction();

    // Then
    expect(updateTag).toHaveBeenCalledWith(CONTENT_TRANSLATIONS_CACHE_TAG);
  });

  it('should leave the cache alone when called outside edit mode', async () => {
    // Given
    vi.mocked(isContentEditModeActive).mockResolvedValue(false);

    // When
    await revalidateContentTranslationsAction();

    // Then
    expect(updateTag).not.toHaveBeenCalled();
  });
});
