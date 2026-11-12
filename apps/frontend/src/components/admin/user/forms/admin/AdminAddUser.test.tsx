import { AdminAddUser } from '@/components/admin/user/forms/admin/AdminAddUser';
import testRender from '@/utils/test/test-render';
import { act, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type MutationConfig = {
  variables: Record<string, unknown>;
  onCompleted: () => void;
  onError: (error: Error) => void;
};

const NEW_USER = {
  email: 'new.user@filigran.io',
  first_name: 'New',
  last_name: 'User',
  organization_capabilities: [],
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

vi.mock('@/components/admin/user/forms/admin/UserAdminForm', () => ({
  UserAdminForm: ({
    handleSubmit,
  }: {
    handleSubmit: (values: unknown) => void;
  }) => <button onClick={() => handleSubmit(NEW_USER)}>submit-user</button>,
}));

const lastMutationConfig = () =>
  mocks.commit.mock.lastCall?.[0] as MutationConfig;

const submitNewUser = async () => {
  const { user } = testRender(<AdminAddUser />);
  await user.click(screen.getByRole('button', { name: 'UserActions.AddUser' }));
  await user.click(screen.getByRole('button', { name: 'submit-user' }));
};

describe('AdminAddUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send the new user without any Relay connection to update', async () => {
    // When
    await submitNewUser();

    // Then
    expect(lastMutationConfig().variables).toEqual({
      input: NEW_USER,
      connections: [],
    });
  });

  it('should reload the users list when the user is created', async () => {
    // Given
    await submitNewUser();

    // When
    act(() => lastMutationConfig().onCompleted());

    // Then
    expect(mocks.refreshUsersList).toHaveBeenCalledOnce();
  });

  it('should leave the users list as is when the creation fails', async () => {
    // Given
    await submitNewUser();

    // When
    act(() => lastMutationConfig().onError(new Error('ADDING_USER_ERROR')));

    // Then
    expect(mocks.refreshUsersList).not.toHaveBeenCalled();
  });
});
