import {
  ServiceListStorageKey,
  useServiceListStorage,
} from '@/hooks/use-service-list-storage';
import { act, renderHook } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const LABEL = 'siem';
const PRIVATE_LABELS_KEY = 'labelPrivateOpenCTIIntegrationFeedsList';
const PUBLIC_LABELS_KEY = 'labelPublicOpenCTIIntegrationFeedsList';

const RESET_KEY_PREFIXES = [
  'pageSize',
  'search',
  'label',
  'integrationType',
  'productVersion',
  'licenseType',
  'solutionCategory',
  'entityType',
  'deployable',
  'verified',
  'orderBy',
  'orderMode',
  'displayMode',
];
const resetKeys = RESET_KEY_PREFIXES.map(
  (prefix) => `${prefix}PrivateOpenCTIIntegrationFeedsList`
);

const renderStorage = () =>
  renderHook(() =>
    useServiceListStorage(ServiceListStorageKey.OpenCTIIntegrationFeeds)
  );

describe('useServiceListStorage persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('should restore the stored selection when it is a valid selection', () => {
    // Given
    window.localStorage.setItem(
      PRIVATE_LABELS_KEY,
      JSON.stringify({ [LABEL]: [] })
    );

    // When
    const { result } = renderStorage();

    // Then
    expect(result.current.labels).toEqual({ [LABEL]: [] });
  });

  it.each([
    ['is not valid JSON', '{not-json'],
    ['is an array', JSON.stringify([LABEL])],
    ['is null', 'null'],
    ['is a string', JSON.stringify(LABEL)],
    ['holds non string values', JSON.stringify({ [LABEL]: [1] })],
  ])(
    'should fall back to an empty selection when the stored value %s',
    (_context, storedValue) => {
      // Given
      window.localStorage.setItem(PRIVATE_LABELS_KEY, storedValue);

      // When
      const { result } = renderStorage();

      // Then
      expect(result.current.labels).toEqual({});
    }
  );

  it('should read the public storage entry when the page is a public path', () => {
    // Given
    vi.mocked(usePathname).mockReturnValue('/cybersecurity-solutions');
    window.localStorage.setItem(
      PUBLIC_LABELS_KEY,
      JSON.stringify({ [LABEL]: [] })
    );

    // When
    const { result } = renderStorage();

    // Then
    expect(result.current.labels).toEqual({ [LABEL]: [] });
  });

  it('should remove every stored entry when resetAll is called', () => {
    // Given
    for (const key of resetKeys) {
      window.localStorage.setItem(key, JSON.stringify({ [LABEL]: [] }));
    }
    const { result } = renderStorage();

    // When
    act(() => {
      result.current.resetAll();
    });

    // Then
    expect(result.current.labels).toEqual({});
    for (const key of resetKeys) {
      expect(window.localStorage.getItem(key)).toBeNull();
    }
  });
});
