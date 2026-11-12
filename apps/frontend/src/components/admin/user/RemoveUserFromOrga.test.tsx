import { RemoveUserFromOrga } from '@/components/admin/user/RemoveUserFromOrga';
import { UsersListUser } from '@/components/admin/user/user-list.types';
import * as SnackbarStore from '@/components/ui/snackbar/snackbar-store';
import { mockMutationHook } from '@/utils/test/mock-mutation-hook';
import {
  mockTranslations,
  translateWithValues,
} from '@/utils/test/mock-translations';
import testRender from '@/utils/test/test-render';
import { screen, waitFor, within } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The organization selected by the user testRender provides.
const SELECTED_ORGANIZATION_ID = 'org-test-456';
const REMOVE_LABEL = 'MenuActions.Remove';
const SERVER_ERROR_CODE = 'UNKNOWN_ERROR';

const MEMBER: UsersListUser = {
  id: 'member-id',
  email: 'member@filigran.io',
  first_name: 'Marc',
  last_name: 'Member',
  disabled: false,
  last_login: null,
  country: null,
  status: null,
  invitation_date: null,
  organization_capabilities: [],
};

const mocks = vi.hoisted(() => ({
  useUserOrganizationRemoveMutation: vi.fn(),
  refreshUsersList: vi.fn(),
  setOpenSheet: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useUserOrganizationRemoveMutation: mocks.useUserOrganizationRemoveMutation,
}));

vi.mock('@/components/admin/user/use-refresh-users-list', () => ({
  useRefreshUsersList: () => mocks.refreshUsersList,
}));

vi.mock('@/components/ui/SheetWithPreventingDialog', () => ({
  useDialogContext: () => ({ setOpenSheet: mocks.setOpenSheet }),
}));

const confirmRemoval = async () => {
  const rendered = testRender(<RemoveUserFromOrga user={MEMBER} />);
  await rendered.user.click(screen.getByRole('button', { name: REMOVE_LABEL }));
  await rendered.user.click(
    within(screen.getByRole('alertdialog')).getByRole('button', {
      name: REMOVE_LABEL,
    })
  );
  return rendered;
};

describe('RemoveUserFromOrga', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(SnackbarStore, 'showSnackbar').mockImplementation(() => undefined);
    vi.mocked(useTranslations).mockReturnValue(
      mockTranslations({ translate: translateWithValues })
    );
  });

  it('should remove the member from the selected organization', async () => {
    // Given
    const mutate = mockMutationHook(
      mocks.useUserOrganizationRemoveMutation,
      'success'
    );

    // When
    await confirmRemoval();

    // Then
    expect(mutate).toHaveBeenCalledExactlyOnceWith({
      user_id: MEMBER.id,
      organization_id: SELECTED_ORGANIZATION_ID,
    });
  });

  it('should reload the users list when the member is removed', async () => {
    // Given
    mockMutationHook(mocks.useUserOrganizationRemoveMutation, 'success');

    // When
    await confirmRemoval();

    // Then
    await waitFor(() => expect(mocks.refreshUsersList).toHaveBeenCalledOnce());
  });

  it('should confirm the removal with the email of the member and close the sheet when the member is removed', async () => {
    // Given
    mockMutationHook(mocks.useUserOrganizationRemoveMutation, 'success');

    // When
    await confirmRemoval();

    // Then
    await waitFor(() =>
      expect(SnackbarStore.showSnackbar).toHaveBeenCalledExactlyOnceWith({
        severity: 'success',
        title: 'Utils.Success',
        description: translateWithValues('UserActions.UserRemoved', {
          email: MEMBER.email,
        }),
      })
    );
    expect(mocks.setOpenSheet).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('should leave the users list as is when the removal fails', async () => {
    // Given
    mockMutationHook(mocks.useUserOrganizationRemoveMutation, 'error', {
      error: new Error(SERVER_ERROR_CODE),
    });

    // When
    await confirmRemoval();

    // Then
    await waitFor(() => expect(SnackbarStore.showSnackbar).toHaveBeenCalled());
    expect(mocks.refreshUsersList).not.toHaveBeenCalled();
  });

  it('should show the server error and keep the sheet open when the removal fails', async () => {
    // Given
    mockMutationHook(mocks.useUserOrganizationRemoveMutation, 'error', {
      error: new Error(SERVER_ERROR_CODE),
    });

    // When
    await confirmRemoval();

    // Then
    await waitFor(() =>
      expect(SnackbarStore.showSnackbar).toHaveBeenCalledExactlyOnceWith({
        severity: 'error',
        title: 'Utils.Error',
        description: `Error.Server.${SERVER_ERROR_CODE}`,
      })
    );
    expect(mocks.setOpenSheet).not.toHaveBeenCalled();
  });

  it('should give the outcome callbacks to the mutation hook', () => {
    // Given
    mockMutationHook(mocks.useUserOrganizationRemoveMutation, 'success');

    // When
    testRender(<RemoveUserFromOrga user={MEMBER} />);

    // Then
    expect(mocks.useUserOrganizationRemoveMutation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      })
    );
  });
});
