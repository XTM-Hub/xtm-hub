import testRender from '@/utils/test/test-render';
import {
  OrganizationCapability,
  PortalCapability,
  type OrganizationsAdminListQuery,
} from '@graphql/generated';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './page';

const mocks = vi.hoisted(() => ({
  useOrganizationsAdminListQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useOrganizationsAdminListQuery: mocks.useOrganizationsAdminListQuery,
  });
});

vi.mock('@/lib/graphql-client', () => ({
  portalGraphqlClient: { _mock: 'portalGraphqlClient' },
}));

const STANDARD_USER = { capabilities: [] };
// Administrator of the organization they selected, with no portal capability
const ORGANIZATION_ADMINISTRATOR = {
  capabilities: [],
  selected_org_capabilities: [OrganizationCapability.AdministrateOrganization],
};
const NOT_AUTHORIZED_MESSAGE = 'Error.YouAreNotAuthorized';
const NAME_HEADER = 'OrganizationForm.Name';
const ORGANIZATIONS: OrganizationsAdminListQuery = {
  organizations: { totalCount: 0, edges: [] },
};

describe('Admin organizations page', () => {
  beforeEach(() => {
    mocks.useOrganizationsAdminListQuery.mockReset();
    mocks.useOrganizationsAdminListQuery.mockReturnValue({
      data: ORGANIZATIONS,
      isLoading: false,
      isError: false,
      isPlaceholderData: false,
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
    ({ me }) => {
      // Given
      const page = <Page />;

      // When
      testRender(page, { me });

      // Then
      expect(screen.getByText(NOT_AUTHORIZED_MESSAGE)).toBeInTheDocument();
    }
  );

  it.each([
    { description: 'a standard user', me: STANDARD_USER },
    {
      description: 'an administrator of the selected organization',
      me: ORGANIZATION_ADMINISTRATOR,
    },
  ])(
    'should send no organizations query for $description without READ_ORGANIZATION_MEMBERS',
    ({ me }) => {
      // Given
      const page = <Page />;

      // When
      testRender(page, { me });

      // Then
      expect(mocks.useOrganizationsAdminListQuery).not.toHaveBeenCalled();
    }
  );

  it.each([PortalCapability.ReadOrganizationMembers, PortalCapability.Bypass])(
    'should show the organizations table to a user holding %s',
    (capability) => {
      // Given
      const page = <Page />;

      // When
      testRender(page, { me: { capabilities: [{ name: capability }] } });

      // Then
      expect(
        screen.getByRole('columnheader', { name: NAME_HEADER })
      ).toBeInTheDocument();
    }
  );
});
