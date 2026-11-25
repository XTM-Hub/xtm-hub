import testRender from '@/utils/test/test-render';
import {
  OrganizationCapability,
  PortalCapability,
  type OrganizationMembersQuery,
} from '@graphql/generated';
import { screen } from '@testing-library/react';
import { notFound } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './page';

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

const ORGANIZATION_ID = 'T3JnYW5pemF0aW9uOnJvdXRl';
// Global id of Organization:abc, whose base64 ends with the "==" padding
const PADDED_ORGANIZATION_ID = 'T3JnYW5pemF0aW9uOmFiYw==';
const URL_ENCODED_SLUG = encodeURIComponent(PADDED_ORGANIZATION_ID);
const UNDECODABLE_SLUG = '%E0%A4%A';
const STANDARD_USER = { capabilities: [] };
// Administrator of the organization they selected, with no portal capability
const ORGANIZATION_ADMINISTRATOR = {
  capabilities: [],
  selected_org_capabilities: [OrganizationCapability.AdministrateOrganization],
};
const NOT_AUTHORIZED_MESSAGE = 'Error.YouAreNotAuthorized';
const EMAIL_HEADER = 'UserListPage.Email';
const MEMBERS: OrganizationMembersQuery = {
  organizationMembers: { totalCount: 0, edges: [] },
};

const renderPage = async (slug = ORGANIZATION_ID) =>
  await Page({ params: Promise.resolve({ slug }) });

describe('Admin organization members page', () => {
  beforeEach(() => {
    vi.mocked(notFound).mockClear();
    mocks.useOrganizationSubscribedServicesBreadcrumbQuery.mockReset();
    mocks.useOrganizationSubscribedServicesBreadcrumbQuery.mockReturnValue({
      data: undefined,
    });
    mocks.useOrganizationMembersQuery.mockReset();
    mocks.useOrganizationMembersQuery.mockReturnValue({
      data: MEMBERS,
      error: null,
      isLoading: false,
    });
  });

  it.each([
    { description: 'a standard user', me: STANDARD_USER },
    {
      description: 'an administrator of the selected organization',
      me: ORGANIZATION_ADMINISTRATOR,
    },
  ])(
    'should tell $description without READ_ORGANIZATION_MEMBERS that they are not authorized',
    async ({ me }) => {
      // Given
      const page = await renderPage();

      // When
      testRender(page, { me });

      // Then
      expect(screen.getByText(NOT_AUTHORIZED_MESSAGE)).toBeInTheDocument();
    }
  );

  it.each([
    {
      description: 'a standard user',
      me: STANDARD_USER,
      query: 'name',
      hook: mocks.useOrganizationSubscribedServicesBreadcrumbQuery,
    },
    {
      description: 'a standard user',
      me: STANDARD_USER,
      query: 'members',
      hook: mocks.useOrganizationMembersQuery,
    },
    {
      description: 'an administrator of the selected organization',
      me: ORGANIZATION_ADMINISTRATOR,
      query: 'name',
      hook: mocks.useOrganizationSubscribedServicesBreadcrumbQuery,
    },
    {
      description: 'an administrator of the selected organization',
      me: ORGANIZATION_ADMINISTRATOR,
      query: 'members',
      hook: mocks.useOrganizationMembersQuery,
    },
  ])(
    'should send no $query query for $description without READ_ORGANIZATION_MEMBERS',
    async ({ me, hook }) => {
      // Given
      const page = await renderPage();

      // When
      testRender(page, { me });

      // Then
      expect(hook).not.toHaveBeenCalled();
    }
  );

  it.each([PortalCapability.ReadOrganizationMembers, PortalCapability.Bypass])(
    'should show the members table to a user holding %s',
    async (capability) => {
      // Given
      const page = await renderPage();

      // When
      testRender(page, { me: { capabilities: [{ name: capability }] } });

      // Then
      expect(
        screen.getByRole('columnheader', { name: EMAIL_HEADER })
      ).toBeInTheDocument();
    }
  );

  it('should query the decoded organization id when the slug is URL-encoded', async () => {
    // Given
    const page = await renderPage(URL_ENCODED_SLUG);

    // When
    testRender(page, {
      me: {
        capabilities: [{ name: PortalCapability.ReadOrganizationMembers }],
      },
    });

    // Then
    expect(
      mocks.useOrganizationSubscribedServicesBreadcrumbQuery
    ).toHaveBeenCalledWith(expect.anything(), { id: PADDED_ORGANIZATION_ID });
  });

  it('should answer not found when the organization id cannot be decoded', async () => {
    // Given / When
    await renderPage(UNDECODABLE_SLUG);

    // Then
    expect(notFound).toHaveBeenCalledTimes(1);
  });
});
