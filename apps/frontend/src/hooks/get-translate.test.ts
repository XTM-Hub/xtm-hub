import { isContentEditModeActive } from '@/utils/content-translation/content-edit-mode.server';
import { decodeContentKeyMarker } from '@/utils/content-translation/invisible-marker';
import { getTranslations } from 'next-intl/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTranslate } from './get-translate';

vi.mock('next-intl/server', () => ({ getTranslations: vi.fn() }));
vi.mock('@/utils/content-translation/content-edit-mode.server', () => ({
  isContentEditModeActive: vi.fn(),
}));

const NAMESPACE = 'PublicHomePage.XtmPlatform';
const TRANSLATED_TITLE = 'Extend and scale your XTM Platform';

describe('getTranslate', () => {
  beforeEach(() => {
    vi.mocked(getTranslations).mockResolvedValue(
      (() => TRANSLATED_TITLE) as unknown as Awaited<
        ReturnType<typeof getTranslations>
      >
    );
  });

  it('should return the plain next-intl translator when edit mode is off', async () => {
    // Given
    vi.mocked(isContentEditModeActive).mockResolvedValue(false);

    // When
    const t = await getTranslate(NAMESPACE);

    // Then
    expect(t('Title')).toBe(TRANSLATED_TITLE);
  });

  it.each([
    ['a namespace', NAMESPACE, `${NAMESPACE}.Title`],
    [
      'a locale and namespace',
      { locale: 'en', namespace: NAMESPACE },
      `${NAMESPACE}.Title`,
    ],
    ['no namespace', undefined, 'Title'],
  ])(
    'should mark rendered strings with their full key when edit mode is on and given %s',
    async (_label, options, expectedKey) => {
      // Given
      vi.mocked(isContentEditModeActive).mockResolvedValue(true);

      // When
      const t = await getTranslate(options);

      // Then
      expect(decodeContentKeyMarker(t('Title')).contentKey).toBe(expectedKey);
    }
  );
});
