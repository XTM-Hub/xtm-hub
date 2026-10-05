import SsoGroupRolePortalActions from '@/components/admin/role/SsoGroupRolePortalActions';
import testRender from '@/utils/test/test-render';
import { PortalCapability } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const SSO_GROUP = 'xtmhub-admins';
const ROLE_PORTAL = 'Admin';

describe('SsoGroupRolePortalActions', () => {
  it('should open the edit sheet prefilled with the row values and capabilities', async () => {
    const { user } = testRender(
      <SsoGroupRolePortalActions
        ssoGroup={SSO_GROUP}
        rolePortal={ROLE_PORTAL}
        capabilities={[PortalCapability.Bypass]}
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
    expect(screen.getByLabelText(/RoleListPage.Role/)).toHaveValue(ROLE_PORTAL);
    expect(
      screen.getByLabelText(/RoleListPage.Capabilities/)
    ).toBeInTheDocument();
    expect(screen.getByText(PortalCapability.Bypass)).toBeInTheDocument();
  });

  it('should open the delete confirmation dialog', async () => {
    const { user } = testRender(
      <SsoGroupRolePortalActions
        ssoGroup={SSO_GROUP}
        rolePortal={ROLE_PORTAL}
        capabilities={[PortalCapability.Bypass]}
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
