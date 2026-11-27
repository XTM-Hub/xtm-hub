import testRender from '@/utils/test/test-render';
import { type OrganizationMembersQuery } from '@graphql/generated';
import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PageLoader from './page-loader';

const mocks = vi.hoisted(() => ({
  useOrganizationSubscribedServicesBreadcrumbQuery: vi.fn(),
  useOrganizationMembersQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useOrganizationSubscribedServicesBreadcrumbQuery:
    mocks.useOrganizationSubscribedServicesBreadcrumbQuery,
  useOrganizationMembersQuery: mocks.useOrganizationMembersQuery,
}));

vi.mock('@/lib/graphql-client', () => ({
  portalGraphqlClient: { _mock: 'portalGraphqlClient' },
}));

const ROUTE_ORGANIZATION_ID = 'T3JnYW5pemF0aW9uOnJvdXRl';
const SELECTED_ORGANIZATION_ID = 'selected-organization';
const ORGANIZATION_NAME = 'Filigran';
const SETTINGS_LABEL = 'MenuLinks.Settings';
const ORGANIZATION_LABEL = 'MenuLinks.Organization';
const BREADCRUMB_LABEL = 'DesignSystem.Breadcrumbs.Label';
const NOT_FOUND_MESSAGE = 'Error.Server.ORGANIZATION_NOT_FOUND';
const MEMBERS: OrganizationMembersQuery = {
  organizationMembers: { totalCount: 0, edges: [] },
};

const renderPageLoader = () =>
  testRender(<PageLoader id={ROUTE_ORGANIZATION_ID} />, {
    me: { selected_organization_id: SELECTED_ORGANIZATION_ID },
  });

const getBreadcrumbTexts = () =>
  within(screen.getByRole('navigation', { name: BREADCRUMB_LABEL }))
    .getAllByRole('listitem')
    .map((item) => item.textContent);

describe('Admin organization members page loader', () => {
  beforeEach(() => {
    mocks.useOrganizationSubscribedServicesBreadcrumbQuery.mockReset();
    mocks.useOrganizationMembersQuery.mockReset();
    mocks.useOrganizationMembersQuery.mockReturnValue({
      data: MEMBERS,
      error: null,
      isLoading: false,
    });
  });

  it('should end the breadcrumb with the organization name once it is loaded', () => {
    // Given
    mocks.useOrganizationSubscribedServicesBreadcrumbQuery.mockReturnValue({
      data: {
        organization: { id: ROUTE_ORGANIZATION_ID, name: ORGANIZATION_NAME },
      },
    });

    // When
    renderPageLoader();

    // Then
    expect(getBreadcrumbTexts()).toEqual([
      SETTINGS_LABEL,
      ORGANIZATION_LABEL,
      ORGANIZATION_NAME,
    ]);
  });

  it('should leave the encoded id out of the breadcrumb while the name loads', () => {
    // Given
    mocks.useOrganizationSubscribedServicesBreadcrumbQuery.mockReturnValue({
      data: undefined,
    });

    // When
    renderPageLoader();

    // Then
    expect(getBreadcrumbTexts()).toEqual([SETTINGS_LABEL, ORGANIZATION_LABEL]);
  });

  it('should ask for the name of the route organization, not the selected one', () => {
    // Given
    mocks.useOrganizationSubscribedServicesBreadcrumbQuery.mockReturnValue({
      data: undefined,
    });

    // When
    renderPageLoader();

    // Then
    expect(
      mocks.useOrganizationSubscribedServicesBreadcrumbQuery.mock.lastCall?.[1]
        .id
    ).toBe(ROUTE_ORGANIZATION_ID);
  });

  it('should tell the organization was not found when the API returns none', () => {
    // Given
    mocks.useOrganizationSubscribedServicesBreadcrumbQuery.mockReturnValue({
      data: { organization: null },
    });

    // When
    renderPageLoader();

    // Then
    expect(screen.getByText(NOT_FOUND_MESSAGE)).toBeInTheDocument();
  });

  it('should not render the table when the API returns no organization', () => {
    // Given
    mocks.useOrganizationSubscribedServicesBreadcrumbQuery.mockReturnValue({
      data: { organization: null },
    });

    // When
    renderPageLoader();

    // Then
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
