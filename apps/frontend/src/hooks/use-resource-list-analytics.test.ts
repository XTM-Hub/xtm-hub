import { useResourceListAnalytics } from '@/hooks/use-resource-list-analytics';
import { revokeAnalyticsConsent } from '@/lib/analytics/analytics.client';
import { SEARCH_IDLE_MS } from '@/lib/analytics/analytics.consts';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import {
  readGtagCommands,
  readTrackedEvents,
  resetAnalyticsEnvironment,
  startAnalytics,
} from '@/utils/test/analytics';
import { type LogicalFilterInput } from '@graphql/generated';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const SEARCH_TERM = 'phishing';
const PREFIX_SEARCH_TERM = 'phish';
const LOGICAL_FILTERS: LogicalFilterInput = {
  leaf: { key: 'label', value: ['use-case-1'] },
};
const OTHER_FILTERS: LogicalFilterInput = {
  leaf: { key: 'label', value: ['use-case-2'] },
};
const FIRST_PAGE = [{ id: 'resource-1', name: 'Phishing connector' }];
const SECOND_PAGE = [{ id: 'resource-2', name: 'Ransomware connector' }];

type HookParams = Parameters<typeof useResourceListAnalytics>[0];

const makeParams = (overrides: Partial<HookParams> = {}): HookParams => ({
  resourceType: ShareableResourceType.OPENCTI_INTEGRATION,
  variables: { searchTerm: '', logicalFilters: LOGICAL_FILTERS },
  totalCount: FIRST_PAGE.length + SECOND_PAGE.length,
  resources: FIRST_PAGE,
  ...overrides,
});

const renderListAnalytics = () =>
  renderHook((params: HookParams) => useResourceListAnalytics(params), {
    initialProps: makeParams(),
  });

beforeEach(() => {
  startAnalytics();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useResourceListAnalytics', () => {
  it.each([
    [
      'the network replaces the stored results',
      makeParams({
        variables: { searchTerm: '', logicalFilters: { ...LOGICAL_FILTERS } },
        resources: [...FIRST_PAGE],
      }),
    ],
    ['the next page is displayed', makeParams({ resources: SECOND_PAGE })],
    [
      'the list is sorted',
      makeParams({ resources: [...SECOND_PAGE, ...FIRST_PAGE] }),
    ],
  ])('should send the list once when %s', (_context, nextParams) => {
    // Given
    const { rerender } = renderListAnalytics();

    // When
    rerender(nextParams);

    // Then
    expect(readTrackedEvents('view_item_list')).toHaveLength(1);
  });

  it('should send nothing while the results are not the ones of the current list, then send the list once they are', () => {
    // Given
    const { rerender } = renderHook(
      (params: HookParams) => useResourceListAnalytics(params),
      { initialProps: makeParams({ enabled: false, resources: [] }) }
    );

    // When
    rerender(makeParams({ enabled: false, resources: [] }));

    // Then
    expect(readTrackedEvents('view_item_list')).toHaveLength(0);

    // When
    rerender(makeParams({ enabled: true }));

    // Then
    expect(readTrackedEvents('view_item_list')).toHaveLength(1);
  });

  it('should send the trimmed term when the search changes', () => {
    // Given
    vi.useFakeTimers();
    const { rerender } = renderListAnalytics();

    // When
    rerender(
      makeParams({
        variables: {
          searchTerm: ` ${SEARCH_TERM} `,
          logicalFilters: LOGICAL_FILTERS,
        },
      })
    );
    act(() => vi.advanceTimersByTime(SEARCH_IDLE_MS));

    // Then
    expect(readTrackedEvents('search')).toEqual([
      expect.objectContaining({ search_term: SEARCH_TERM }),
    ]);
  });

  it('should send only the full term when the visitor goes on typing while the results of the new term are loading', () => {
    // Given
    vi.useFakeTimers();
    const { rerender } = renderListAnalytics();
    rerender(
      makeParams({
        variables: {
          searchTerm: PREFIX_SEARCH_TERM,
          logicalFilters: LOGICAL_FILTERS,
        },
      })
    );
    const fullTermParams = makeParams({
      variables: { searchTerm: SEARCH_TERM, logicalFilters: LOGICAL_FILTERS },
    });

    // When
    rerender({ ...fullTermParams, enabled: false });
    act(() => vi.advanceTimersByTime(SEARCH_IDLE_MS));
    rerender(fullTermParams);
    act(() => vi.advanceTimersByTime(SEARCH_IDLE_MS));

    // Then
    expect(readTrackedEvents('search')).toEqual([
      expect.objectContaining({ search_term: SEARCH_TERM }),
    ]);
  });

  it('should keep the pending search when the filters change before the visitor stops typing', () => {
    // Given
    vi.useFakeTimers();
    const { rerender } = renderListAnalytics();
    rerender(
      makeParams({
        variables: { searchTerm: SEARCH_TERM, logicalFilters: LOGICAL_FILTERS },
      })
    );

    // When
    rerender(
      makeParams({
        variables: { searchTerm: SEARCH_TERM, logicalFilters: OTHER_FILTERS },
      })
    );
    act(() => vi.advanceTimersByTime(SEARCH_IDLE_MS));

    // Then
    expect(readTrackedEvents('search')).toEqual([
      expect.objectContaining({ search_term: SEARCH_TERM }),
    ]);
  });

  it('should send the displayed list without the search when analytics is enabled after the list was searched', () => {
    // Given
    resetAnalyticsEnvironment();
    const { rerender } = renderListAnalytics();
    rerender(
      makeParams({
        variables: { searchTerm: SEARCH_TERM, logicalFilters: LOGICAL_FILTERS },
      })
    );

    // When
    act(() => startAnalytics());

    // Then
    expect(
      readGtagCommands()
        .filter(([command]) => command === 'event')
        .map(([, name]) => name)
    ).toEqual(['view_item_list']);
  });

  it('should send the displayed list without the search when analytics is enabled again after a search made while it was withdrawn', () => {
    // Given
    const { rerender } = renderListAnalytics();
    act(() => revokeAnalyticsConsent());
    rerender(
      makeParams({
        variables: { searchTerm: SEARCH_TERM, logicalFilters: LOGICAL_FILTERS },
      })
    );

    // When
    act(() => startAnalytics());

    // Then
    expect(
      readGtagCommands()
        .filter(([command]) => command === 'event')
        .map(([, name]) => name)
    ).toEqual(['view_item_list']);
  });
});
