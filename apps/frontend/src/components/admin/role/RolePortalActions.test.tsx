import RolePortalActions from '@/components/admin/role/RolePortalActions';
import testRender from '@/utils/test/test-render';
import { PortalCapability } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const ROLE_PORTAL = 'Auditor';

describe('RolePortalActions', () => {
  it('should open the edit sheet prefilled with the role and its capabilities', async () => {
    const { user } = testRender(
      <RolePortalActions
        rolePortal={ROLE_PORTAL}
        capabilities={[PortalCapability.Bypass]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Utils.OpenMenu' }));
    await user.click(
      await screen.findByRole('menuitem', { name: 'Utils.Update' })
    );

    expect(
      await screen.findByRole('heading', { name: 'RoleListPage.EditRole' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/RoleListPage.Role/)).toHaveValue(ROLE_PORTAL);
    expect(screen.getByText(PortalCapability.Bypass)).toBeInTheDocument();
  });

  it('should open the delete confirmation dialog', async () => {
    const { user } = testRender(
      <RolePortalActions
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
        name: 'RoleListPage.DeleteRoleDialog.Title',
      })
    ).toBeInTheDocument();
  });
});
