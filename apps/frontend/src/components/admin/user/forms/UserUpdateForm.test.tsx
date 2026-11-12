import { UserUpdateForm } from '@/components/admin/user/forms/UserUpdateForm';
import { UsersListUser } from '@/components/admin/user/user-list.types';
import testRender from '@/utils/test/test-render';
import { OrganizationCapability } from '@graphql/generated';
import { act, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type MutationConfig = {
  variables: Record<string, unknown>;
  onCompleted: () => void;
  onError: (error: Error) => void;
};

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

const mocks = vi.hoisted(() => ({
  commit: vi.fn(),
  refreshUsersList: vi.fn(),
}));

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-relay')>()),
  useMutation: () => [mocks.commit, false],
}));

vi.mock('@/components/admin/user/use-refresh-users-list', () => ({
  useRefreshUsersList: () => mocks.refreshUsersList,
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

const lastMutationConfig = () =>
  mocks.commit.mock.lastCall?.[0] as MutationConfig;

const submitCapabilities = async () => {
  const { user } = testRender(
    <UserUpdateForm
      user={MEMBER}
      callback={vi.fn()}
    />
  );
  const validate = screen.getByRole('button', { name: 'Utils.Validate' });
  await waitFor(() => expect(validate).toBeEnabled());
  await user.click(validate);
};

describe('UserUpdateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send the capabilities without any Relay connection to update', async () => {
    // When
    await submitCapabilities();

    // Then
    expect(lastMutationConfig().variables).toEqual({
      id: MEMBER.id,
      input: { capabilities: [OrganizationCapability.ManageAccess] },
      userListConnections: [],
    });
  });

  it('should reload the users list when the capabilities are saved', async () => {
    // Given
    await submitCapabilities();

    // When
    act(() => lastMutationConfig().onCompleted());

    // Then
    expect(mocks.refreshUsersList).toHaveBeenCalledOnce();
  });

  it('should leave the users list as is when the update fails', async () => {
    // Given
    await submitCapabilities();

    // When
    act(() => lastMutationConfig().onError(new Error('UNKNOWN_ERROR')));

    // Then
    expect(mocks.refreshUsersList).not.toHaveBeenCalled();
  });
});
