import DeleteSsoGroupRolePortal from '@/components/admin/role/DeleteSsoGroupRolePortal';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import {
  DeleteSsoGroupRolePortalMutation,
  DeleteSsoGroupRolePortalMutationVariables,
} from '@graphql/generated';
import { mockRolePortal, mockSsoGroupRolePortal } from '@graphql/mocks';
import { screen, waitFor } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

const GQL_OPERATION_DELETE_SSO_GROUP_ROLE_PORTAL = 'DeleteSSOGroupRolePortal';
const SSO_GROUP = 'xtmhub-admins';
const ROLE_PORTAL = 'Admin';

describe('DeleteSsoGroupRolePortal', () => {
  it('should display the confirmation text', () => {
    testRender(
      <DeleteSsoGroupRolePortal
        open
        onOpenChange={vi.fn()}
        ssoGroup={SSO_GROUP}
        rolePortal={ROLE_PORTAL}
      />
    );

    expect(
      screen.getByRole('alertdialog', {
        name: 'RoleListPage.DeleteDialog.Title',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText('RoleListPage.DeleteDialog.Text')
    ).toBeInTheDocument();
  });

  it('should delete the SSO group mapping when the deletion is confirmed', async () => {
    let capturedVariables:
      DeleteSsoGroupRolePortalMutationVariables | undefined;
    const response: DeleteSsoGroupRolePortalMutation = {
      deleteSSOGroupRolePortal: mockSsoGroupRolePortal({
        ssoGroup: SSO_GROUP,
        rolePortal: mockRolePortal({ id: 'role-admin', name: ROLE_PORTAL }),
      }),
    };
    mswServer.use(
      graphql.mutation(
        GQL_OPERATION_DELETE_SSO_GROUP_ROLE_PORTAL,
        ({ variables }) => {
          capturedVariables =
            variables as DeleteSsoGroupRolePortalMutationVariables;
          return HttpResponse.json({ data: response });
        }
      )
    );

    const { user } = testRender(
      <DeleteSsoGroupRolePortal
        open
        onOpenChange={vi.fn()}
        ssoGroup={SSO_GROUP}
        rolePortal={ROLE_PORTAL}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Utils.Delete' }));

    await waitFor(() => {
      expect(capturedVariables).toEqual({
        input: { ssoGroup: SSO_GROUP, rolePortal: ROLE_PORTAL },
      });
    });
  });

  it('should not delete the SSO group mapping when the deletion is cancelled', async () => {
    let mutationCalled = false;
    mswServer.use(
      graphql.mutation(GQL_OPERATION_DELETE_SSO_GROUP_ROLE_PORTAL, () => {
        mutationCalled = true;
        return HttpResponse.json({ errors: [{ message: 'UNKNOWN_ERROR' }] });
      })
    );
    const onOpenChange = vi.fn();

    const { user } = testRender(
      <DeleteSsoGroupRolePortal
        open
        onOpenChange={onOpenChange}
        ssoGroup={SSO_GROUP}
        rolePortal={ROLE_PORTAL}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Utils.Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mutationCalled).toBe(false);
  });
});
