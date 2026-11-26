import { UserUpdateForm } from '@/components/admin/user/forms/UserUpdateForm';
import { UsersListUser } from '@/components/admin/user/user-list.types';
import * as SnackbarStore from '@/components/ui/snackbar/snackbar-store';
import useAdminPath from '@/hooks/use-admin-path';
import { mockMutationHook } from '@/utils/test/mock-mutation-hook';
import {
  mockTranslations,
  translateWithValues,
} from '@/utils/test/mock-translations';
import testRender from '@/utils/test/test-render';
import { OrganizationCapability } from '@graphql/generated';
import { screen, waitFor } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The organization selected by the user testRender provides.
const SELECTED_ORGANIZATION_ID = 'org-test-456';

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
  organization_capabilities: [
    {
      id: 'member-capabilities',
      organization: {
        id: SELECTED_ORGANIZATION_ID,
        name: 'Organization',
        personal_space: false,
      },
      capabilities: [OrganizationCapability.ManageAccess],
    },
  ],
};

const SERVER_ERROR_CODE = 'UNKNOWN_ERROR';

const mocks = vi.hoisted(() => ({
  useUserCapabilitiesEditMutation: vi.fn(),
  refreshUsersList: vi.fn(),
  callback: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useUserCapabilitiesEditMutation: mocks.useUserCapabilitiesEditMutation,
}));

vi.mock('@/components/admin/user/use-refresh-users-list', () => ({
  useRefreshUsersList: () => mocks.refreshUsersList,
}));

vi.mock('@/hooks/use-admin-path', () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock('@/components/admin/user/RemoveUserFromOrga', () => ({
  RemoveUserFromOrga: () => null,
}));

vi.mock('@/components/ui/SheetWithPreventingDialog', () => ({
  useDialogContext: () => ({
    handleCloseSheet: vi.fn(),
    setIsDirty: vi.fn(),
    setOpenSheet: vi.fn(),
  }),
}));

const submitCapabilities = async () => {
  const rendered = testRender(
    <UserUpdateForm
      user={MEMBER}
      callback={mocks.callback}
    />
  );
  const validate = screen.getByRole('button', { name: 'Utils.Validate' });
  await waitFor(() => expect(validate).toBeEnabled());
  await rendered.user.click(validate);
  return rendered;
};

describe('UserUpdateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAdminPath).mockReturnValue(false);
    vi.spyOn(SnackbarStore, 'showSnackbar').mockImplementation(() => undefined);
    vi.mocked(useTranslations).mockReturnValue(
      mockTranslations({ translate: translateWithValues })
    );
  });

  it('should send the capabilities of the member', async () => {
    // Given
    const mutate = mockMutationHook(
      mocks.useUserCapabilitiesEditMutation,
      'success'
    );

    // When
    await submitCapabilities();

    // Then
    expect(mutate).toHaveBeenCalledExactlyOnceWith({
      id: MEMBER.id,
      input: { capabilities: [OrganizationCapability.ManageAccess] },
    });
  });

  it('should send the names with the capabilities of the user on the admin path', async () => {
    // Given
    vi.mocked(useAdminPath).mockReturnValue(true);
    const mutate = mockMutationHook(
      mocks.useUserCapabilitiesEditMutation,
      'success'
    );

    // When
    await submitCapabilities();

    // Then
    expect(mutate).toHaveBeenCalledExactlyOnceWith({
      id: MEMBER.id,
      input: {
        first_name: MEMBER.first_name,
        last_name: MEMBER.last_name,
        capabilities: [OrganizationCapability.ManageAccess],
      },
    });
  });

  it('should reload the users list when the capabilities are saved', async () => {
    // Given
    mockMutationHook(mocks.useUserCapabilitiesEditMutation, 'success');

    // When
    await submitCapabilities();

    // Then
    await waitFor(() => expect(mocks.refreshUsersList).toHaveBeenCalledOnce());
  });

  it('should confirm the update with the email of the member and hand back to the caller when the capabilities are saved', async () => {
    // Given
    mockMutationHook(mocks.useUserCapabilitiesEditMutation, 'success');

    // When
    await submitCapabilities();

    // Then
    await waitFor(() =>
      expect(SnackbarStore.showSnackbar).toHaveBeenCalledExactlyOnceWith({
        severity: 'success',
        title: 'Utils.Success',
        description: translateWithValues('UserActions.UserUpdated', {
          email: MEMBER.email,
        }),
      })
    );
    expect(mocks.callback).toHaveBeenCalledOnce();
  });

  it('should leave the users list as is when the update fails', async () => {
    // Given
    mockMutationHook(mocks.useUserCapabilitiesEditMutation, 'error', {
      error: new Error(SERVER_ERROR_CODE),
    });

    // When
    await submitCapabilities();

    // Then
    await waitFor(() => expect(SnackbarStore.showSnackbar).toHaveBeenCalled());
    expect(mocks.refreshUsersList).not.toHaveBeenCalled();
  });

  it('should show the server error and keep the form when the update fails', async () => {
    // Given
    mockMutationHook(mocks.useUserCapabilitiesEditMutation, 'error', {
      error: new Error(SERVER_ERROR_CODE),
    });

    // When
    await submitCapabilities();

    // Then
    await waitFor(() =>
      expect(SnackbarStore.showSnackbar).toHaveBeenCalledExactlyOnceWith({
        severity: 'error',
        title: 'Utils.Error',
        description: `Error.Server.${SERVER_ERROR_CODE}`,
      })
    );
    expect(mocks.callback).not.toHaveBeenCalled();
  });

  it('should give the outcome callbacks to the mutation hook', () => {
    // Given
    mockMutationHook(mocks.useUserCapabilitiesEditMutation, 'success');

    // When
    testRender(
      <UserUpdateForm
        user={MEMBER}
        callback={mocks.callback}
      />
    );

    // Then
    expect(mocks.useUserCapabilitiesEditMutation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      })
    );
  });
});
