import { getAuthenticatedGraphqlClient } from '@/lib/graphql-client';
import { isContentEditModeActive } from '@/utils/content-translation/content-edit-mode.server';
import { Locale } from '@graphql/generated';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadContentTranslationDrafts } from './content-translation-drafts.server';

vi.mock('@/lib/graphql-client', () => ({
  getAuthenticatedGraphqlClient: vi.fn(),
}));
vi.mock('@/utils/content-translation/content-edit-mode.server', () => ({
  isContentEditModeActive: vi.fn(),
}));

const DRAFT = {
  key: 'PublicHomePage.XtmPlatform.Title',
  locale: Locale.En,
  value: 'Grow your XTM Platform',
};

const request = vi.fn();

describe('loadContentTranslationDrafts', () => {
  beforeEach(() => {
    request.mockResolvedValue({ contentTranslationDrafts: [DRAFT] });
    // Only the method the loader calls: the full client is not needed.
    vi.mocked(getAuthenticatedGraphqlClient).mockResolvedValue({
      request,
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedGraphqlClient>>);
  });

  it('should load the drafts for an editor in edit mode', async () => {
    // Given
    vi.mocked(isContentEditModeActive).mockResolvedValue(true);

    // When
    const drafts = await loadContentTranslationDrafts();

    // Then
    expect(drafts).toEqual([DRAFT]);
  });

  it('should not query drafts outside edit mode', async () => {
    // Given
    vi.mocked(isContentEditModeActive).mockResolvedValue(false);

    // When
    const drafts = await loadContentTranslationDrafts();

    // Then
    expect({ drafts, requested: request.mock.calls.length }).toEqual({
      drafts: [],
      requested: 0,
    });
  });

  it('should render without drafts when they cannot be loaded', async () => {
    // Given
    vi.mocked(isContentEditModeActive).mockResolvedValue(true);
    request.mockRejectedValue(new Error('backend unreachable'));

    // When
    const drafts = await loadContentTranslationDrafts();

    // Then
    expect(drafts).toEqual([]);
  });
});
