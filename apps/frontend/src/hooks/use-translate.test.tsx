import { EditModeProvider } from '@/context/edit-mode-context';
import { decodeContentKeyMarker } from '@/utils/content-translation/invisible-marker';
import { renderHook } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTranslate } from './use-translate';

const NAMESPACE = 'PublicHomePage.XtmPlatform';
const KEY = 'Title';
const TRANSLATED_TITLE = 'Extend and scale your XTM Platform';

// next-intl memoizes its translator; the global mock builds a new one per
// call, so pin a single instance to mirror the real identity guarantee.
const stableTranslator = Object.assign(() => TRANSLATED_TITLE, {
  has: () => true,
  rich: () => TRANSLATED_TITLE,
});

const renderUseTranslate = (isEditMode: boolean) =>
  renderHook(() => useTranslate(NAMESPACE), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <EditModeProvider
        canEditContent={isEditMode}
        isEditMode={isEditMode}
        pendingChangeCount={0}
        overriddenKeys={[]}>
        {children}
      </EditModeProvider>
    ),
  });

describe('useTranslate', () => {
  beforeEach(() => {
    vi.mocked(useTranslations).mockReturnValue(
      stableTranslator as unknown as ReturnType<typeof useTranslations>
    );
  });

  it('should keep the same translator across re-renders when edit mode is on', () => {
    // Given
    const { result, rerender } = renderUseTranslate(true);
    const firstTranslator = result.current;

    // When
    rerender();

    // Then
    expect(result.current).toBe(firstTranslator);
  });

  it('should mark rendered strings with their fully-qualified key when edit mode is on', () => {
    // Given
    const { result } = renderUseTranslate(true);

    // When
    const rendered = result.current(KEY);

    // Then
    expect(decodeContentKeyMarker(rendered)).toEqual({
      cleanText: TRANSLATED_TITLE,
      contentKey: `${NAMESPACE}.${KEY}`,
    });
  });

  it('should return the next-intl translator untouched when edit mode is off', () => {
    // Given
    const { result } = renderUseTranslate(false);

    // When
    const rendered = result.current(KEY);

    // Then
    expect(rendered).toBe(TRANSLATED_TITLE);
  });
});
