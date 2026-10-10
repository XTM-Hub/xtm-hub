import { DeleteUser } from '@/components/admin/user/DeleteUser';
import { mockGraphqlMutation } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import { UserList_fragment$data } from '@generated/UserList_fragment.graphql';
import { UserDeleteMutation } from '@graphql/generated';
import { mockUser } from '@graphql/mocks';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const showSnackbarMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: showSnackbarMock,
}));

const GQL_OPERATION_USER_DELETE = 'UserDelete';

const user = {
  id: 'user-to-delete',
  email: 'to-delete@filigran.io',
} as UserList_fragment$data;

const renderDeleteUser = (onUserDeleted = vi.fn(), setOpen = vi.fn()) =>
  testRender(
    <DeleteUser
      user={user}
      onUserDeleted={onUserDeleted}
      open={true}
      setOpen={setOpen}
    />
  );

const clickDelete = async (userEvent: { click: (el: Element) => unknown }) => {
  await userEvent.click(screen.getByRole('button', { name: 'Utils.Delete' }));
};

describe('DeleteUser', () => {
  beforeEach(() => {
    showSnackbarMock.mockReset();
  });

  it('should display the confirmation dialog', () => {
    renderDeleteUser();

    expect(screen.getByText('UserActions.DeleteUser')).toBeInTheDocument();
    expect(screen.getByText('UserActions.SureDeleteUser')).toBeInTheDocument();
  });

  it('should show a success toast and call onUserDeleted once the user is deleted', async () => {
    const onUserDeleted = vi.fn();
    const setOpen = vi.fn();
    const deleteUserResponse: UserDeleteMutation = {
      deleteUser: mockUser({ id: user.id }),
    };

    mswServer.use(
      mockGraphqlMutation({
        queryName: GQL_OPERATION_USER_DELETE,
        data: deleteUserResponse,
      })
    );

    const { user: userEvent } = renderDeleteUser(onUserDeleted, setOpen);

    await clickDelete(userEvent);

    await waitFor(() => {
      expect(showSnackbarMock).toHaveBeenCalledWith({
        severity: 'success',
        title: 'Utils.Success',
        description: 'UserActions.UserDeleted',
      });
    });
    expect(onUserDeleted).toHaveBeenCalledTimes(1);
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it.each`
    errorCode
    ${'DELETE_USER_BLOCKED_BY_TRANSFER_REQUEST'}
    ${'DELETE_USER_BLOCKED_BY_DEPLOYMENT_REQUEST'}
    ${'DELETE_USER_BLOCKED_BY_PENDING_USERS'}
    ${'CANT_DELETE_YOURSELF'}
  `(
    'should open the blocked dialog instead of a toast for $errorCode',
    async ({ errorCode }) => {
      mswServer.use(
        mockGraphqlMutation({
          queryName: GQL_OPERATION_USER_DELETE,
          errors: [{ message: errorCode }],
        })
      );

      const { user: userEvent } = renderDeleteUser();

      await clickDelete(userEvent);

      expect(
        await screen.findByText('UserActions.DeletionBlocked')
      ).toBeInTheDocument();
      expect(screen.getByText(`Error.Server.${errorCode}`)).toBeInTheDocument();
      expect(
        screen.queryByText('UserActions.DeleteUser')
      ).not.toBeInTheDocument();
      expect(showSnackbarMock).not.toHaveBeenCalled();
    }
  );

  it('should fall back to a destructive toast for an unexpected error', async () => {
    const setOpen = vi.fn();
    mswServer.use(
      mockGraphqlMutation({
        queryName: GQL_OPERATION_USER_DELETE,
        errors: [{ message: 'DELETE_USER_ERROR' }],
      })
    );

    const { user: userEvent } = renderDeleteUser(vi.fn(), setOpen);

    await clickDelete(userEvent);

    await waitFor(() => {
      expect(showSnackbarMock).toHaveBeenCalledWith({
        severity: 'error',
        title: 'Utils.Error',
        description: 'Error.Server.DELETE_USER_ERROR',
      });
    });
    expect(
      screen.queryByText('UserActions.DeletionBlocked')
    ).not.toBeInTheDocument();
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it('should close the blocked dialog and reset open state when user dismisses it', async () => {
    const setOpen = vi.fn();
    mswServer.use(
      mockGraphqlMutation({
        queryName: GQL_OPERATION_USER_DELETE,
        errors: [{ message: 'CANT_DELETE_BUILTIN_USER' }],
      })
    );

    const { user: userEvent } = renderDeleteUser(vi.fn(), setOpen);

    await clickDelete(userEvent);

    expect(
      await screen.findByText('UserActions.DeletionBlocked')
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Utils.Close' }));

    expect(setOpen).toHaveBeenCalledWith(false);
  });
});
