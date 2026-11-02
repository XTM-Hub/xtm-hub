import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import {
  DeleteSsoGroupRolePortalMutation,
  DeleteSsoGroupRolePortalMutationVariables,
  useSsoGroupRolePortalsQuery,
} from '@graphql/generated';
import { mockRolePortal, mockSsoGroupRolePortal } from '@graphql/mocks';
import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const GQL_OPERATION_DELETE_SSO_GROUP_ROLE_PORTAL = 'DeleteSSOGroupRolePortal';
const SSO_GROUP = 'xtmhub-admins';
const ROLE_PORTAL = 'Admin';

type DeleteSsoGroupRolePortalModule =
  typeof import('@/components/admin/role/DeleteSsoGroupRolePortal');
type AppSnackbarsModule =
  typeof import('@/components/ui/snackbar/AppSnackbars');

let DeleteSsoGroupRolePortal: DeleteSsoGroupRolePortalModule['default'];
let AppSnackbars: AppSnackbarsModule['AppSnackbars'];

beforeEach(async () => {
  // The messages live at module level: a fresh module per test keeps the
  // message of one deletion out of the next.
  vi.resetModules();
  ({ default: DeleteSsoGroupRolePortal } =
    await import('@/components/admin/role/DeleteSsoGroupRolePortal'));
  ({ AppSnackbars } = await import('@/components/ui/snackbar/AppSnackbars'));
});

afterEach(() => {
  vi.restoreAllMocks();
});

const renderDeleteSsoGroupRolePortal = (onOpenChange = vi.fn()) =>
  testRender(
    <AppSnackbars>
      <DeleteSsoGroupRolePortal
        open
        onOpenChange={onOpenChange}
        ssoGroup={SSO_GROUP}
        rolePortal={ROLE_PORTAL}
      />
    </AppSnackbars>
  );

describe('DeleteSsoGroupRolePortal', () => {
  it('should display the confirmation text', () => {
    renderDeleteSsoGroupRolePortal();

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

    const { user } = renderDeleteSsoGroupRolePortal();

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

    const { user } = renderDeleteSsoGroupRolePortal(onOpenChange);

    await user.click(screen.getByRole('button', { name: 'Utils.Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mutationCalled).toBe(false);
  });

  it('should confirm the deletion, close the dialog and refresh the SSO group list when it succeeds', async () => {
    // Given
    const invalidateQueries = vi.spyOn(
      QueryClient.prototype,
      'invalidateQueries'
    );
    mswServer.use(
      graphql.mutation(GQL_OPERATION_DELETE_SSO_GROUP_ROLE_PORTAL, () =>
        HttpResponse.json({
          data: {
            deleteSSOGroupRolePortal: mockSsoGroupRolePortal({
              ssoGroup: SSO_GROUP,
              rolePortal: mockRolePortal({
                id: 'role-admin',
                name: ROLE_PORTAL,
              }),
            }),
          },
        })
      )
    );
    const onOpenChange = vi.fn();
    const { user } = renderDeleteSsoGroupRolePortal(onOpenChange);

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Delete' }));

    // Then
    expect(await screen.findByText('Utils.Success')).toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: useSsoGroupRolePortalsQuery.getKey(),
    });
  });

  it('should report the server error to the administrator when the deletion fails', async () => {
    // Given
    mswServer.use(
      graphql.mutation(GQL_OPERATION_DELETE_SSO_GROUP_ROLE_PORTAL, () =>
        HttpResponse.json({ errors: [{ message: 'UNKNOWN_ERROR' }] })
      )
    );
    const onOpenChange = vi.fn();
    const { user } = renderDeleteSsoGroupRolePortal(onOpenChange);

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Delete' }));

    // Then
    expect(await screen.findByText('Utils.Error')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByText('Error.Server.UNKNOWN_ERROR')).toBeInTheDocument();
  });
});
