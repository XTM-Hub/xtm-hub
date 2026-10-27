import { useServiceListStorage } from '@/hooks/use-service-list-storage';
import { ServiceListStorageKey } from '@/utils/filters-storage.utils';
import { act, renderHook } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const LABEL = 'siem';
const PRIVATE_LABELS_KEY = 'labelPrivateOpenCTIIntegrationFeedsList';
const PUBLIC_LABELS_KEY = 'labelPublicOpenCTIIntegrationFeedsList';

const FILTER_KEY_PREFIXES = [
  'search',
  'label',
  'integrationType',
  'productVersion',
  'licenseType',
  'solutionCategory',
  'entityType',
  'deployable',
  'verified',
];
const DISPLAY_KEY_PREFIXES = [
  'pageSize',
  'orderBy',
  'orderMode',
  'displayMode',
];
const toPrivateKeys = (prefixes: string[]) =>
  prefixes.map((prefix) => `${prefix}PrivateOpenCTIIntegrationFeedsList`);
const filterKeys = toPrivateKeys(FILTER_KEY_PREFIXES);
const displayKeys = toPrivateKeys(DISPLAY_KEY_PREFIXES);

const renderStorage = () =>
  renderHook(() =>
    useServiceListStorage(ServiceListStorageKey.OpenCTIIntegrationFeeds)
  );

describe('useServiceListStorage persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('should restore the stored selection when it is a valid selection', () => {
    // Given
    window.sessionStorage.setItem(
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
      window.sessionStorage.setItem(PRIVATE_LABELS_KEY, storedValue);

      // When
      const { result } = renderStorage();

      // Then
      expect(result.current.labels).toEqual({});
    }
  );

  it('should read the public storage entry when the page is a public path', () => {
    // Given
    vi.mocked(usePathname).mockReturnValue('/cybersecurity-solutions');
    window.sessionStorage.setItem(
      PUBLIC_LABELS_KEY,
      JSON.stringify({ [LABEL]: [] })
    );

    // When
    const { result } = renderStorage();

    // Then
    expect(result.current.labels).toEqual({ [LABEL]: [] });
  });

  it('should ignore a filter left in the local storage', () => {
    // Given
    window.localStorage.setItem(
      PRIVATE_LABELS_KEY,
      JSON.stringify({ [LABEL]: [] })
    );

    // When
    const { result } = renderStorage();

    // Then
    expect(result.current.labels).toEqual({});
  });

  it('should remove every stored entry when resetAll is called', () => {
    // Given
    for (const key of filterKeys) {
      window.sessionStorage.setItem(key, JSON.stringify({ [LABEL]: [] }));
    }
    for (const key of displayKeys) {
      window.localStorage.setItem(key, JSON.stringify({ [LABEL]: [] }));
    }
    const { result } = renderStorage();

    // When
    act(() => {
      result.current.resetAll();
    });

    // Then
    expect(result.current.labels).toEqual({});
    for (const key of filterKeys) {
      expect(window.sessionStorage.getItem(key)).toBeNull();
    }
    for (const key of displayKeys) {
      expect(window.localStorage.getItem(key)).toBeNull();
    }
  });
});
