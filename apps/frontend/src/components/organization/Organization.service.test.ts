import {
  OrderingMode,
  type OrganizationItemFragment,
  OrganizationOrdering,
  type OrganizationsListQuery,
} from '@graphql/generated';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useOrganizations,
  useUnsubscribedOrganizations,
} from './Organization.service';

const mocks = vi.hoisted(() => ({
  useOrganizationsListQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useOrganizationsListQuery: mocks.useOrganizationsListQuery,
  });
});

const SEARCH_TERM = 'acme';
const CURSOR = 'Mg==';

const makeOrg = (id: string, name: string): OrganizationItemFragment => ({
  id,
  name,
  personal_space: false,
  domains: [],
});

const makeSubscription = (orgId: string) => ({
  id: `sub-${orgId}`,
  organization: { id: orgId, name: `Org ${orgId}`, personal_space: false },
});

const makeOrganizationsListResponse = (
  organizations: OrganizationItemFragment[]
): OrganizationsListQuery => ({
  organizations: {
    totalCount: organizations.length,
    edges: organizations.map((node) => ({ node })),
  },
});

describe('useOrganizations', () => {
  beforeEach(() => {
    mocks.useOrganizationsListQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      isPlaceholderData: false,
    });
  });

  it('should expose the organizations and their total count when the list is received', () => {
    // Given
    const organizations = [
      makeOrg('org-1', 'Org 1'),
      makeOrg('org-2', 'Org 2'),
    ];
    mocks.useOrganizationsListQuery.mockReturnValue({
      data: makeOrganizationsListResponse(organizations),
      isLoading: false,
      isError: false,
      isPlaceholderData: false,
    });

    // When
    const { result } = renderHook(() => useOrganizations());

    // Then
    expect(result.current).toEqual({
      organizations,
      totalCount: 2,
      isLoading: false,
      isError: false,
      isPlaceholderData: false,
    });
  });

  it('should expose no organization when the list is still loading', () => {
    // Given / When
    const { result } = renderHook(() => useOrganizations());

    // Then
    expect(result.current).toMatchObject({
      organizations: [],
      totalCount: 0,
      isLoading: true,
    });
  });

  it('should flag the organizations as stale when they belong to the previous variables', () => {
    // Given
    mocks.useOrganizationsListQuery.mockReturnValue({
      data: makeOrganizationsListResponse([makeOrg('org-1', 'Org 1')]),
      isLoading: false,
      isError: false,
      isPlaceholderData: true,
    });

    // When
    const { result } = renderHook(() =>
      useOrganizations({ searchTerm: SEARCH_TERM })
    );

    // Then
    expect(result.current.isPlaceholderData).toBe(true);
  });

  it.each([
    {
      description: 'no parameter is given',
      params: undefined,
      expectedVariables: {
        searchTerm: '',
        count: 50,
        cursor: null,
        orderBy: OrganizationOrdering.Name,
        orderMode: OrderingMode.Asc,
      },
    },
    {
      description: 'a search term, a page and an ordering are given',
      params: {
        searchTerm: SEARCH_TERM,
        count: 25,
        cursor: CURSOR,
        orderBy: OrganizationOrdering.Name,
        orderMode: OrderingMode.Desc,
      },
      expectedVariables: {
        searchTerm: SEARCH_TERM,
        count: 25,
        cursor: CURSOR,
        orderBy: OrganizationOrdering.Name,
        orderMode: OrderingMode.Desc,
      },
    },
  ])(
    'should query the organizations with the expected variables when $description',
    ({ params, expectedVariables }) => {
      // Given / When
      renderHook(() => useOrganizations(params));

      // Then
      expect(mocks.useOrganizationsListQuery).toHaveBeenLastCalledWith(
        expect.anything(),
        expectedVariables,
        expect.anything()
      );
    }
  );
});

describe('useUnsubscribedOrganizations', () => {
  const organizations = [
    makeOrg('org-1', 'Org 1'),
    makeOrg('org-2', 'Org 2'),
    makeOrg('org-3', 'Org 3'),
  ];

  it('should return all organizations when there are no subscriptions', () => {
    const { result } = renderHook(() =>
      useUnsubscribedOrganizations(organizations, [])
    );

    expect(result.current).toHaveLength(3);
    expect(result.current.map((o) => o.id)).toEqual([
      'org-1',
      'org-2',
      'org-3',
    ]);
  });

  it('should exclude already-subscribed organizations', () => {
    const subscriptions = [
      makeSubscription('org-1'),
      makeSubscription('org-2'),
    ];
    const { result } = renderHook(() =>
      useUnsubscribedOrganizations(organizations, subscriptions)
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({ id: 'org-3', name: 'Org 3' });
  });

  it('should keep the edited subscription organization available when editing', () => {
    const subscriptions = [
      makeSubscription('org-1'),
      makeSubscription('org-2'),
    ];
    const subscriptionToEdit = makeSubscription('org-1');
    const { result } = renderHook(() =>
      useUnsubscribedOrganizations(
        organizations,
        subscriptions,
        subscriptionToEdit
      )
    );

    expect(result.current.map((o) => o.id)).toContain('org-1');
    expect(result.current.map((o) => o.id)).not.toContain('org-2');
  });

  it('should return empty array when all organizations are subscribed and none is being edited', () => {
    const subscriptions = [
      makeSubscription('org-1'),
      makeSubscription('org-2'),
      makeSubscription('org-3'),
    ];
    const { result } = renderHook(() =>
      useUnsubscribedOrganizations(organizations, subscriptions)
    );

    expect(result.current).toHaveLength(0);
  });

  it('should ignore subscriptions with no organization id', () => {
    const subscriptions = [
      {
        ...makeSubscription('org-1'),
        organization: { id: '', name: 'Org 1', personal_space: false },
      },
    ];
    const { result } = renderHook(() =>
      useUnsubscribedOrganizations(organizations, subscriptions)
    );

    expect(result.current).toHaveLength(3);
    expect(result.current.map((o) => o.id)).toEqual([
      'org-1',
      'org-2',
      'org-3',
    ]);
  });
});
