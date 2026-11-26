import { mockGraphqlQuery } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import { PortalCapability, RolePortalsQuery } from '@graphql/generated';
import { mockRolePortal } from '@graphql/mocks';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import Page from './page';

const ADMIN_USER = { capabilities: [{ name: PortalCapability.Bypass }] };
const STANDARD_USER = { capabilities: [] };
const ROLE_PORTALS_RESPONSE: RolePortalsQuery = {
  rolePortals: [mockRolePortal({ id: 'role-admin', name: 'Admin' })],
};

describe('Admin roles page', () => {
  beforeEach(() => {
    mswServer.use(
      mockGraphqlQuery({
        queryName: 'RolePortals',
        data: ROLE_PORTALS_RESPONSE,
      })
    );
  });

  it('should show the roles to an administrator', async () => {
    // Given / When
    testRender(<Page />, { me: ADMIN_USER });

    // Then
    expect(
      screen.getByRole('heading', { name: 'MenuLinks.Roles' })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('row', { name: /Admin/ })
    ).toBeInTheDocument();
  });

  it('should tell a standard user that they are not authorized instead of showing the roles', () => {
    // Given / When
    testRender(<Page />, { me: STANDARD_USER });

    // Then
    expect(screen.getByText('Error.YouAreNotAuthorized')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'MenuLinks.Roles' })
    ).not.toBeInTheDocument();
  });
});
