import { AddUser } from '@/components/admin/user/forms/AddUser';
import * as SnackbarStore from '@/components/ui/snackbar/snackbar-store';
import { mockMutationHook } from '@/utils/test/mock-mutation-hook';
import {
  mockTranslations,
  translateWithValues,
} from '@/utils/test/mock-translations';
import testRender from '@/utils/test/test-render';
import { screen, waitFor } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const NEW_USER = { email: 'new.user@filigran.io', capabilities: [] };
const SERVER_ERROR_CODE = 'ADDING_USER_ERROR';
const SHEET_TITLE = 'UserActions.AddUser';

const mocks = vi.hoisted(() => ({
  useUserResendInviteMutation: vi.fn(),
  refreshUsersList: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useUserResendInviteMutation: mocks.useUserResendInviteMutation,
}));

vi.mock('@/components/admin/user/use-refresh-users-list', () => ({
  useRefreshUsersList: () => mocks.refreshUsersList,
}));

vi.mock('@/components/admin/user/forms/UserForm', () => ({
  UserForm: ({ handleSubmit }: { handleSubmit: (values: unknown) => void }) => (
    <button onClick={() => handleSubmit(NEW_USER)}>submit-user</button>
  ),
}));

const submitNewUser = async () => {
  const rendered = testRender(<AddUser />);
  await rendered.user.click(screen.getByRole('button', { name: SHEET_TITLE }));
  await rendered.user.click(
    screen.getByRole('button', { name: 'submit-user' })
  );
  return rendered;
};

describe('AddUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(SnackbarStore, 'showSnackbar').mockImplementation(() => undefined);
    vi.mocked(useTranslations).mockReturnValue(
      mockTranslations({ translate: translateWithValues })
    );
  });

  it('should send the new user', async () => {
    // Given
    const mutate = mockMutationHook(
      mocks.useUserResendInviteMutation,
      'success'
    );

    // When
    await submitNewUser();

    // Then
    expect(mutate).toHaveBeenCalledExactlyOnceWith({
      input: { ...NEW_USER, password: null },
    });
  });

  it('should reload the users list when the user is created', async () => {
    // Given
    mockMutationHook(mocks.useUserResendInviteMutation, 'success');

    // When
    await submitNewUser();

    // Then
    await waitFor(() => expect(mocks.refreshUsersList).toHaveBeenCalledOnce());
  });

  it('should confirm the creation with the email of the user and close the sheet when the user is created', async () => {
    // Given
    mockMutationHook(mocks.useUserResendInviteMutation, 'success');

    // When
    await submitNewUser();

    // Then
    await waitFor(() =>
      expect(SnackbarStore.showSnackbar).toHaveBeenCalledExactlyOnceWith({
        severity: 'success',
        title: 'Utils.Success',
        description: translateWithValues('UserActions.UserCreated', {
          email: NEW_USER.email,
        }),
      })
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'submit-user' })
      ).not.toBeInTheDocument()
    );
  });

  it('should leave the users list as is when the creation fails', async () => {
    // Given
    mockMutationHook(mocks.useUserResendInviteMutation, 'error', {
      error: new Error(SERVER_ERROR_CODE),
    });

    // When
    await submitNewUser();

    // Then
    await waitFor(() => expect(SnackbarStore.showSnackbar).toHaveBeenCalled());
    expect(mocks.refreshUsersList).not.toHaveBeenCalled();
  });

  it('should show the server error and keep the sheet open when the creation fails', async () => {
    // Given
    mockMutationHook(mocks.useUserResendInviteMutation, 'error', {
      error: new Error(SERVER_ERROR_CODE),
    });

    // When
    await submitNewUser();

    // Then
    await waitFor(() =>
      expect(SnackbarStore.showSnackbar).toHaveBeenCalledExactlyOnceWith({
        severity: 'error',
        title: 'Utils.Error',
        description: `Error.Server.${SERVER_ERROR_CODE}`,
      })
    );
    expect(
      screen.getByRole('button', { name: 'submit-user' })
    ).toBeInTheDocument();
  });

  it('should give the outcome callbacks to the mutation hook', () => {
    // Given
    mockMutationHook(mocks.useUserResendInviteMutation, 'success');

    // When
    testRender(<AddUser />);

    // Then
    expect(mocks.useUserResendInviteMutation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      })
    );
  });
});
