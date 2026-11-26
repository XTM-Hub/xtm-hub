import {
  buildEpicListVariables,
  EPIC_LIST_PAGE_SIZE,
} from '@/components/epic/epic-list-query';
import { EpicOrdering, OrderingMode } from '@graphql/generated';
import { describe, expect, it } from 'vitest';

const SEARCH_TERM = 'roadmap';

describe('buildEpicListVariables', () => {
  it.each([
    {
      searchTerm: undefined,
      expectedSearchTerm: null,
      description: 'no search',
    },
    {
      searchTerm: '',
      expectedSearchTerm: null,
      description: 'a cleared search',
    },
    {
      searchTerm: SEARCH_TERM,
      expectedSearchTerm: SEARCH_TERM,
      description: 'a search term',
    },
  ])(
    'should load every epic by title with searchTerm=$expectedSearchTerm for $description',
    ({ searchTerm, expectedSearchTerm }) => {
      // When
      const variables = buildEpicListVariables(searchTerm);

      // Then
      expect(variables).toEqual({
        count: EPIC_LIST_PAGE_SIZE,
        orderBy: EpicOrdering.Title,
        orderMode: OrderingMode.Asc,
        searchTerm: expectedSearchTerm,
      });
    }
  );
});
