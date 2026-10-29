import { TrialsManageUsersForm } from '@/components/service/trial-instances/manage-users/TrialsManageUsersForm';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const GROUP_NAME = 'Administrators';
const USER_EMAIL = 'user@filigran.io';
const VALIDATE_LABEL = 'Utils.Validate';

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-relay')>()),
  readInlineData: (_fragment: unknown, node: unknown) => node,
  useLazyLoadQuery: () => ({
    serviceGroups: [{ id: 'group-1', name: GROUP_NAME, users: [] }],
  }),
  useMutation: () => [vi.fn(), true],
}));

vi.mock('@/hooks/use-users-list', () => ({
  useUsersList: () => ({
    data: { users: { edges: [{ node: { id: 'user-1', email: USER_EMAIL } }] } },
    refetch: vi.fn(),
  }),
}));

describe('TrialsManageUsersForm', () => {
  it('should disable the validate button while the service groups update is in flight', async () => {
    // Given a service groups update in flight
    const { user } = testRender(
      <TrialsManageUsersForm
        onCancel={vi.fn()}
        onCompleted={vi.fn()}
        serviceInstanceId="service-instance-1"
      />
    );

    // When a user is added to a group
    await user.click(screen.getByRole('combobox', { name: GROUP_NAME }));
    await user.click(await screen.findByRole('option', { name: USER_EMAIL }));

    // Then the form cannot be submitted again
    expect(
      screen.getByRole('button', { name: new RegExp(`^${VALIDATE_LABEL}`) })
    ).toBeDisabled();
  });
});
