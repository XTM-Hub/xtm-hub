import { serverGraphqlFetch } from '@/lib/server-graphql-fetch';
import { loadContentTranslationDrafts } from '@/utils/content-translation/content-translation-drafts.server';
import { getMessage } from '@/utils/content-translation/message-overrides';
import { Locale } from '@graphql/generated';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withContentTranslationOverrides } from './content-translation-overrides';

vi.mock('@/lib/server-graphql-fetch', () => ({ serverGraphqlFetch: vi.fn() }));
vi.mock(
  '@/utils/content-translation/content-translation-drafts.server',
  () => ({ loadContentTranslationDrafts: vi.fn() })
);

const TITLE_KEY = 'PublicHomePage.XtmPlatform.Title';
const COMMITTED_TITLE = 'Extend and scale your XTM Platform';
const PUBLISHED_TITLE = 'Scale your XTM Platform';
const DRAFT_TITLE = 'Grow your XTM Platform';

const makeMessages = () => ({
  PublicHomePage: { XtmPlatform: { Title: COMMITTED_TITLE } },
});

const givenPublished = (value: string) =>
  vi.mocked(serverGraphqlFetch).mockResolvedValue({
    contentTranslations: [{ key: TITLE_KEY, value }],
  });

const givenDrafts = (drafts: { locale: Locale; value: string }[]) =>
  vi
    .mocked(loadContentTranslationDrafts)
    .mockResolvedValue(
      drafts.map(({ locale, value }) => ({ key: TITLE_KEY, locale, value }))
    );

describe('withContentTranslationOverrides', () => {
  beforeEach(() => {
    givenPublished(PUBLISHED_TITLE);
    givenDrafts([]);
  });

  it('should render the published value when there is no draft', async () => {
    // Given
    const messages = makeMessages();

    // When
    const merged = await withContentTranslationOverrides('en', messages);

    // Then
    expect(getMessage(merged, TITLE_KEY)).toBe(PUBLISHED_TITLE);
  });

  it('should render the draft over the published value when the draft targets the rendered locale', async () => {
    // Given
    givenDrafts([{ locale: Locale.En, value: DRAFT_TITLE }]);

    // When
    const merged = await withContentTranslationOverrides('en', makeMessages());

    // Then
    expect(getMessage(merged, TITLE_KEY)).toBe(DRAFT_TITLE);
  });

  it('should ignore a draft of another locale', async () => {
    // Given
    givenDrafts([{ locale: Locale.Fr, value: DRAFT_TITLE }]);

    // When
    const merged = await withContentTranslationOverrides('en', makeMessages());

    // Then
    expect(getMessage(merged, TITLE_KEY)).toBe(PUBLISHED_TITLE);
  });

  it('should still render drafts when the published overrides cannot be fetched', async () => {
    // Given
    vi.mocked(serverGraphqlFetch).mockRejectedValue(new Error('unreachable'));
    givenDrafts([{ locale: Locale.En, value: DRAFT_TITLE }]);

    // When
    const merged = await withContentTranslationOverrides('en', makeMessages());

    // Then
    expect(getMessage(merged, TITLE_KEY)).toBe(DRAFT_TITLE);
  });
});
