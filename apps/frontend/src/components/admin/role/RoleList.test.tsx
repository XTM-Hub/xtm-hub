import RoleList from '@/components/admin/role/RoleList';
import { mockGraphqlQuery } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import { PortalCapability, SsoGroupRolePortalsQuery } from '@graphql/generated';
import {
  mockCapability,
  mockRolePortal,
  mockSsoGroupRolePortal,
} from '@graphql/mocks';
import { screen } from '@testing-library/react';

describe('RoleList', () => {
  it('should render SSO groups with their role and capabilities', async () => {
    const mockedResponse: SsoGroupRolePortalsQuery = {
      ssoGroupRolePortals: [
        mockSsoGroupRolePortal({
          ssoGroup: 'xtmhub-admins',
          rolePortal: mockRolePortal({
            id: 'role-admin',
            name: 'Admin',
            capabilities: [
              mockCapability({
                id: 'capability-bypass',
                name: PortalCapability.Bypass,
              }),
            ],
          }),
        }),
        mockSsoGroupRolePortal({
          ssoGroup: 'xtmhub-users',
          rolePortal: mockRolePortal({
            id: 'role-user',
            name: 'User',
            capabilities: [],
          }),
        }),
      ],
    };

    mswServer.use(
      mockGraphqlQuery({
        queryName: 'SSOGroupRolePortals',
        data: mockedResponse,
      })
    );

    testRender(<RoleList />);

    expect(
      screen.getByRole('heading', { name: 'MenuLinks.Roles' })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('row', { name: /xtmhub-admins.*Admin.*BYPASS/ })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('row', { name: /xtmhub-users.*User/ })
    ).toBeInTheDocument();
  });
});
