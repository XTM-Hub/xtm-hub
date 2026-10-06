import RolePortalCapabilitiesList from '@/components/admin/role/RolePortalCapabilitiesList';
import { mockGraphqlQuery } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import { PortalCapability, RolePortalsQuery } from '@graphql/generated';
import { mockCapability, mockRolePortal } from '@graphql/mocks';
import { screen } from '@testing-library/react';

describe('RolePortalCapabilitiesList', () => {
  it('should render each role with its capabilities', async () => {
    const mockedResponse: RolePortalsQuery = {
      rolePortals: [
        mockRolePortal({
          id: 'role-admin',
          name: 'Admin',
          capabilities: [
            mockCapability({
              id: 'capability-bypass',
              name: PortalCapability.Bypass,
            }),
          ],
        }),
        mockRolePortal({
          id: 'role-user',
          name: 'User',
          capabilities: [],
        }),
      ],
    };

    mswServer.use(
      mockGraphqlQuery({
        queryName: 'RolePortals',
        data: mockedResponse,
      })
    );

    testRender(<RolePortalCapabilitiesList />);

    expect(
      await screen.findByRole('row', { name: /Admin.*BYPASS/ })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('row', { name: /User/ })
    ).toBeInTheDocument();
  });
});
