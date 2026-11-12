import { RemoveUserFromOrga } from '@/components/admin/user/RemoveUserFromOrga';
import { UsersListUser } from '@/components/admin/user/user-list.types';
import testRender from '@/utils/test/test-render';
import { act, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type MutationConfig = {
  variables: Record<string, unknown>;
  onCompleted: () => void;
  onError: (error: Error) => void;
};

// The organization selected by the user testRender provides.
const SELECTED_ORGANIZATION_ID = 'org-test-456';
const CONFIRM_REMOVAL = 'confirm-MenuActions.Remove';

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

vi.mock('@/components/ui/SheetWithPreventingDialog', () => ({
  useDialogContext: () => ({ setOpenSheet: vi.fn() }),
}));

vi.mock('@/components/ui/ConfirmDialog', () => ({
  ConfirmDialog: ({
    confirmLabel,
    onConfirm,
  }: {
    confirmLabel: string;
    onConfirm: () => void;
    children: ReactNode;
  }) => <button onClick={onConfirm}>{`confirm-${confirmLabel}`}</button>,
}));

const lastMutationConfig = () =>
  mocks.commit.mock.lastCall?.[0] as MutationConfig;

const confirmRemoval = async () => {
  const { user } = testRender(<RemoveUserFromOrga user={MEMBER} />);
  await user.click(screen.getByRole('button', { name: CONFIRM_REMOVAL }));
};

describe('RemoveUserFromOrga', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should remove the member from the selected organization without any Relay connection to update', async () => {
    // When
    await confirmRemoval();

    // Then
    expect(lastMutationConfig().variables).toEqual({
      user_id: MEMBER.id,
      organization_id: SELECTED_ORGANIZATION_ID,
      connections: [],
    });
  });

  it('should reload the users list when the member is removed', async () => {
    // Given
    await confirmRemoval();

    // When
    act(() => lastMutationConfig().onCompleted());

    // Then
    expect(mocks.refreshUsersList).toHaveBeenCalledOnce();
  });

  it('should leave the users list as is when the removal fails', async () => {
    // Given
    await confirmRemoval();

    // When
    act(() => lastMutationConfig().onError(new Error('UNKNOWN_ERROR')));

    // Then
    expect(mocks.refreshUsersList).not.toHaveBeenCalled();
  });
});
