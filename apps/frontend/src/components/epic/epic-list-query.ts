import {
  EpicOrdering,
  EpicsQueryVariables,
  OrderingMode,
} from '@graphql/generated';

// The roadmap loads every epic at once and filters them client-side.
export const EPIC_LIST_PAGE_SIZE = 500;

/**
 * Variables of the epic list, shared by the server prefetch and the client
 * hook: they build its query key, so both sides must produce the same value.
 * An empty search is sent as `null`, never as an empty string.
 */
export const buildEpicListVariables = (
  searchTerm?: string
): EpicsQueryVariables => ({
  count: EPIC_LIST_PAGE_SIZE,
  orderBy: EpicOrdering.Title,
  orderMode: OrderingMode.Asc,
  searchTerm: searchTerm || null,
});
