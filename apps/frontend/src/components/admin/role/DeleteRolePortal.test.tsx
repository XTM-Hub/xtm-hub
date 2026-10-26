import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import {
  DeleteRolePortalMutation,
  DeleteRolePortalMutationVariables,
  useRolePortalsQuery,
  useSsoGroupRolePortalsQuery,
} from '@graphql/generated';
import { mockRolePortal } from '@graphql/mocks';
import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const GQL_OPERATION_DELETE_ROLE_PORTAL = 'DeleteRolePortal';
const ROLE_PORTAL = 'Auditor';
const NOT_AN_ERROR = 'connection lost';

type DeleteRolePortalModule =
  typeof import('@/components/admin/role/DeleteRolePortal');
type AppSnackbarsModule =
  typeof import('@/components/ui/snackbar/AppSnackbars');

let DeleteRolePortal: DeleteRolePortalModule['default'];
let AppSnackbars: AppSnackbarsModule['AppSnackbars'];

const loadModules = async () => {
  // The messages live at module level: a fresh module per test keeps the
  // message of one deletion out of the next.
  vi.resetModules();
  ({ default: DeleteRolePortal } =
    await import('@/components/admin/role/DeleteRolePortal'));
  ({ AppSnackbars } = await import('@/components/ui/snackbar/AppSnackbars'));
};

const renderDeleteRolePortal = (onOpenChange = vi.fn()) =>
  testRender(
    <AppSnackbars>
      <DeleteRolePortal
        open
        onOpenChange={onOpenChange}
        rolePortal={ROLE_PORTAL}
      />
    </AppSnackbars>
  );

const deletedRolePortalResponse = () =>
  HttpResponse.json({
    data: {
      deleteRolePortal: mockRolePortal({
        id: 'role-auditor',
        name: ROLE_PORTAL,
      }),
    },
  });

beforeEach(loadModules);

afterEach(() => {
  vi.restoreAllMocks();
  vi.doUnmock('@graphql/generated');
});

describe('DeleteRolePortal', () => {
  it('should display the confirmation text', () => {
    renderDeleteRolePortal();

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

    const { user } = renderDeleteRolePortal();

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

    const { user } = renderDeleteRolePortal(onOpenChange);

    await user.click(screen.getByRole('button', { name: 'Utils.Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mutationCalled).toBe(false);
  });

  it('should confirm the deletion, close the dialog and refresh the role lists when it succeeds', async () => {
    // Given
    const invalidateQueries = vi.spyOn(
      QueryClient.prototype,
      'invalidateQueries'
    );
    mswServer.use(
      graphql.mutation(GQL_OPERATION_DELETE_ROLE_PORTAL, () =>
        deletedRolePortalResponse()
      )
    );
    const onOpenChange = vi.fn();
    const { user } = renderDeleteRolePortal(onOpenChange);

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Delete' }));

    // Then
    expect(await screen.findByText('Utils.Success')).toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: useRolePortalsQuery.getKey(),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: useSsoGroupRolePortalsQuery.getKey(),
    });
  });

  it('should report the server error to the administrator when the deletion fails', async () => {
    // Given
    mswServer.use(
      graphql.mutation(GQL_OPERATION_DELETE_ROLE_PORTAL, () =>
        HttpResponse.json({ errors: [{ message: 'UNKNOWN_ERROR' }] })
      )
    );
    const onOpenChange = vi.fn();
    const { user } = renderDeleteRolePortal(onOpenChange);

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Delete' }));

    // Then
    expect(await screen.findByText('Utils.Error')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByText('Error.Server.UNKNOWN_ERROR')).toBeInTheDocument();
  });

  it('should report an unknown error when the deletion fails with something that is not an error', async () => {
    // Given
    // The network layer always rejects with an Error, so the mutation hook is
    // replaced to reach the fallback. The mock is registered for this test only:
    // the module is loaded again to pick it up, and unregistered after each test.
    vi.doMock('@graphql/generated', async (importOriginal) => ({
      ...(await importOriginal<typeof import('@graphql/generated')>()),
      useDeleteRolePortalMutation: (
        _client: unknown,
        options: { onError: (error: unknown) => void }
      ) => ({
        mutate: () => options.onError(NOT_AN_ERROR),
        isPending: false,
      }),
    }));
    await loadModules();
    const onOpenChange = vi.fn();
    const { user } = renderDeleteRolePortal(onOpenChange);

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Delete' }));

    // Then
    expect(await screen.findByText('Utils.Error')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByText('Error.Server.UnknownError')).toBeInTheDocument();
  });
});
