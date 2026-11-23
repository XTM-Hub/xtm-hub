import { RequestTransferPersonalSpace } from '@/components/profile/form/RequestTransferPersonalSpace';
import { mockMutationHook } from '@/utils/test/mock-mutation-hook';
import testRender from '@/utils/test/test-render';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const NEW_EMAIL = 'grace.hopper@filigran.io';

const mocks = vi.hoisted(() => ({
  useMePersonalSpaceTransferRequestMutation: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useMePersonalSpaceTransferRequestMutation:
    mocks.useMePersonalSpaceTransferRequestMutation,
}));

describe('RequestTransferPersonalSpace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send the new email when the user confirms the transfer', async () => {
    // Given
    const requestTransfer = mockMutationHook(
      mocks.useMePersonalSpaceTransferRequestMutation,
      'success'
    );
    const { user } = testRender(<RequestTransferPersonalSpace />);
    await user.type(
      screen.getByRole('textbox', { name: 'UserListPage.UserForm.Email' }),
      `${NEW_EMAIL}{Enter}`
    );

    // When
    await user.click(
      await screen.findByRole('button', { name: 'MenuActions.Continue' })
    );

    // Then
    await waitFor(() =>
      expect(requestTransfer).toHaveBeenCalledExactlyOnceWith({
        new_email: NEW_EMAIL,
      })
    );
  });
});
