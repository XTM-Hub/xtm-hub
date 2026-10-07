import DeleteRolePortal from '@/components/admin/role/DeleteRolePortal';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import {
  DeleteRolePortalMutation,
  DeleteRolePortalMutationVariables,
} from '@graphql/generated';
import { mockRolePortal } from '@graphql/mocks';
import { screen, waitFor } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

const GQL_OPERATION_DELETE_ROLE_PORTAL = 'DeleteRolePortal';
const ROLE_PORTAL = 'Auditor';

describe('DeleteRolePortal', () => {
  it('should display the confirmation text', () => {
    testRender(
      <DeleteRolePortal
        open
        onOpenChange={vi.fn()}
        rolePortal={ROLE_PORTAL}
      />
    );

    expect(
      screen.getByRole('alertdialog', {
        name: 'RoleListPage.DeleteRoleDialog.Title',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText('RoleListPage.DeleteRoleDialog.Text')
    ).toBeInTheDocument();
  });

  it('should delete the role when the deletion is confirmed', async () => {
    let capturedVariables: DeleteRolePortalMutationVariables | undefined;
    const response: DeleteRolePortalMutation = {
      deleteRolePortal: mockRolePortal({
        id: 'role-auditor',
        name: ROLE_PORTAL,
      }),
    };
    mswServer.use(
      graphql.mutation(GQL_OPERATION_DELETE_ROLE_PORTAL, ({ variables }) => {
        capturedVariables = variables as DeleteRolePortalMutationVariables;
        return HttpResponse.json({ data: response });
      })
    );

    const { user } = testRender(
      <DeleteRolePortal
        open
        onOpenChange={vi.fn()}
        rolePortal={ROLE_PORTAL}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Utils.Delete' }));

    await waitFor(() => {
      expect(capturedVariables).toEqual({ name: ROLE_PORTAL });
    });
  });

  it('should not delete the role when the deletion is cancelled', async () => {
    let mutationCalled = false;
    mswServer.use(
      graphql.mutation(GQL_OPERATION_DELETE_ROLE_PORTAL, () => {
        mutationCalled = true;
        return HttpResponse.json({ errors: [{ message: 'UNKNOWN_ERROR' }] });
      })
    );
    const onOpenChange = vi.fn();

    const { user } = testRender(
      <DeleteRolePortal
        open
        onOpenChange={onOpenChange}
        rolePortal={ROLE_PORTAL}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Utils.Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mutationCalled).toBe(false);
  });
});
