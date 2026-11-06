import { useResourceListAnalytics } from '@/hooks/use-resource-list-analytics';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { readTrackedEvents, startAnalytics } from '@/utils/test/analytics';
import { type LogicalFilterInput } from '@generated/documentsQuery.graphql';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

const SEARCH_TERM = 'phishing';
const LOGICAL_FILTERS: LogicalFilterInput = {
  leaf: { key: 'label', value: ['use-case-1'] },
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

  it('should send the trimmed term when the search changes', () => {
    // Given
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

    // Then
    expect(readTrackedEvents('search')).toEqual([
      expect.objectContaining({ search_term: SEARCH_TERM }),
    ]);
  });
});
