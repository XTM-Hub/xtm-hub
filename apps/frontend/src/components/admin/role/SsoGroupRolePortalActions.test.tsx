import SsoGroupRolePortalActions from '@/components/admin/role/SsoGroupRolePortalActions';
import { mockGraphqlQuery } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import { RolePortalsQuery } from '@graphql/generated';
import { mockRolePortal } from '@graphql/mocks';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

const GQL_OPERATION_ROLE_PORTALS = 'RolePortals';
const SSO_GROUP = 'xtmhub-admins';
const ROLE_PORTAL = 'Admin';

const ROLE_PORTALS_RESPONSE: RolePortalsQuery = {
  rolePortals: [
    mockRolePortal({ id: 'role-admin', name: 'Admin' }),
    mockRolePortal({ id: 'role-user', name: 'User' }),
  ],
};

describe('SsoGroupRolePortalActions', () => {
  beforeEach(() => {
    mswServer.use(
      mockGraphqlQuery({
        queryName: GQL_OPERATION_ROLE_PORTALS,
        data: ROLE_PORTALS_RESPONSE,
      })
    );
  });

  it('should open the edit sheet prefilled with the row values', async () => {
    const { user } = testRender(
      <SsoGroupRolePortalActions
        ssoGroup={SSO_GROUP}
        rolePortal={ROLE_PORTAL}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Utils.OpenMenu' }));
    await user.click(
      await screen.findByRole('menuitem', { name: 'Utils.Update' })
    );

    expect(
      await screen.findByRole('heading', { name: 'RoleListPage.EditMapping' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/RoleListPage.SsoGroup/)).toHaveValue(
      SSO_GROUP
    );
    await waitFor(() => {
      expect(screen.getByLabelText(/RoleListPage.Role/)).toHaveValue(
        ROLE_PORTAL
      );
    });
  });

  it('should open the delete confirmation dialog', async () => {
    const { user } = testRender(
      <SsoGroupRolePortalActions
        ssoGroup={SSO_GROUP}
        rolePortal={ROLE_PORTAL}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Utils.OpenMenu' }));
    await user.click(
      await screen.findByRole('menuitem', { name: 'Utils.Delete' })
    );

    expect(
      await screen.findByRole('alertdialog', {
        name: 'RoleListPage.DeleteDialog.Title',
      })
    ).toBeInTheDocument();
  });
});
