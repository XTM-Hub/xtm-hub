import {
  type ResourceListSnapshot,
  resolveResourceListEvents,
} from '@/lib/analytics/analytics.list';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { describe, expect, it } from 'vitest';

const LIBRARY = 'Integrations';
const OTHER_LIBRARY = 'Custom Views';
const PRODUCT = 'OpenCTI';
const RESOURCE_UUID = '3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b';
const RESOURCE_NAME = 'Phishing connector';
const OTHER_RESOURCE_UUID = '9c81d7e6-1a2b-4c3d-9e8f-7a6b5c4d3e2f';
const OTHER_RESOURCE_NAME = 'Ransomware connector';
const TOTAL_COUNT = 42;
const SEARCH_TERM = 'phishing';
const OTHER_SEARCH_TERM = 'ransomware';
const SHORT_SEARCH_TERM = 'ab';
const INDICATOR_SEARCH_TERM = 'phishing 8.8.8.8';
const MASKED_SEARCH_TERM = 'phishing [ip]';
const FILTERS = '{"labels":["use-case-1"]}';

const RESULTS = {
  totalCount: TOTAL_COUNT,
  resources: [
    { id: btoa(`Document:${RESOURCE_UUID}`), name: RESOURCE_NAME },
    { id: OTHER_RESOURCE_UUID, name: OTHER_RESOURCE_NAME },
  ],
};
const NO_RESULTS = { totalCount: 0, resources: [] };

const makeSnapshot = (
  overrides: Partial<ResourceListSnapshot> = {}
): ResourceListSnapshot => ({
  resourceType: ShareableResourceType.OPENCTI_INTEGRATION,
  searchTerm: '',
  filters: '{}',
  ...overrides,
});

describe('resolveResourceListEvents', () => {
  it('should describe the displayed resources as items in their order when the list is displayed', () => {
    // Given / When
    const { viewItemList } = resolveResourceListEvents(
      null,
      makeSnapshot(),
      RESULTS
    );

    // Then
    expect(viewItemList).toEqual({
      library: LIBRARY,
      product: PRODUCT,
      item_list_name: LIBRARY,
      result_count: TOTAL_COUNT,
      has_results: 'Yes',
      items: [
        {
          item_id: RESOURCE_UUID,
          item_name: RESOURCE_NAME,
          item_category: LIBRARY,
          item_brand: PRODUCT,
          index: 0,
        },
        {
          item_id: OTHER_RESOURCE_UUID,
          item_name: OTHER_RESOURCE_NAME,
          item_category: LIBRARY,
          item_brand: PRODUCT,
          index: 1,
        },
      ],
    });
  });

  it.each([
    [
      'the filters change for the same term',
      makeSnapshot({ filters: FILTERS, searchTerm: SEARCH_TERM }),
      LIBRARY,
    ],
    ['the search is cleared', makeSnapshot(), LIBRARY],
    [
      'the search term is shorter than three characters',
      makeSnapshot({ searchTerm: SHORT_SEARCH_TERM }),
      LIBRARY,
    ],
    [
      'another library is displayed with its own term',
      makeSnapshot({
        resourceType: ShareableResourceType.OPENCTI_CUSTOM_VIEW,
        searchTerm: OTHER_SEARCH_TERM,
      }),
      OTHER_LIBRARY,
    ],
  ])(
    'should send the list without a search when %s',
    (_context, current, expectedLibrary) => {
      // Given
      const previous = makeSnapshot({ searchTerm: SEARCH_TERM });

      // When
      const events = resolveResourceListEvents(previous, current, RESULTS);

      // Then
      expect(events).toEqual({
        viewItemList: expect.objectContaining({ library: expectedLibrary }),
      });
    }
  );

  it('should send nothing when the list did not change', () => {
    // Given
    const previous = makeSnapshot();

    // When
    const events = resolveResourceListEvents(previous, makeSnapshot(), RESULTS);

    // Then
    expect(events).toEqual({});
  });

  it.each([
    ['abc', 'abc'],
    [SEARCH_TERM, SEARCH_TERM],
    [INDICATOR_SEARCH_TERM, MASKED_SEARCH_TERM],
  ])(
    'should send the search of %s as %s when the term changes on the same list',
    (searchTerm, sentSearchTerm) => {
      // Given
      const previous = makeSnapshot({ searchTerm: SHORT_SEARCH_TERM });

      // When
      const { search } = resolveResourceListEvents(
        previous,
        makeSnapshot({ searchTerm }),
        RESULTS
      );

      // Then
      expect(search).toEqual({
        library: LIBRARY,
        product: PRODUCT,
        search_term: sentSearchTerm,
        result_count: TOTAL_COUNT,
        has_results: 'Yes',
      });
    }
  );

  it('should not send a search when a stored term is displayed for the first time', () => {
    // Given / When
    const { search } = resolveResourceListEvents(
      null,
      makeSnapshot({ searchTerm: SEARCH_TERM }),
      RESULTS
    );

    // Then
    expect(search).toBeUndefined();
  });

  it('should flag the search as without results when nothing matches', () => {
    // Given
    const previous = makeSnapshot();

    // When
    const { search } = resolveResourceListEvents(
      previous,
      makeSnapshot({ searchTerm: SEARCH_TERM }),
      NO_RESULTS
    );

    // Then
    expect(search?.has_results).toBe('No');
  });
});
