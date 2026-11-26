import { TransferPersonalSpace } from '@/components/profile/form/TransferPersonalSpace';
import { mockMutationHook } from '@/utils/test/mock-mutation-hook';
import testRender from '@/utils/test/test-render';
import { waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const REQUEST_ID = 'transfer-request-1';

const mocks = vi.hoisted(() => ({
  useMePersonalSpaceTransferMutation: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useMePersonalSpaceTransferMutation: mocks.useMePersonalSpaceTransferMutation,
}));

describe('TransferPersonalSpace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should transfer the personal space once when the page opens with a request id', () => {
    // Given
    const transfer = vi.fn();
    mocks.useMePersonalSpaceTransferMutation.mockReturnValue({
      mutate: transfer,
    });
    const { rerender } = testRender(
      <TransferPersonalSpace requestId={REQUEST_ID} />
    );

    // When
    rerender(<TransferPersonalSpace requestId={REQUEST_ID} />);

    // Then
    expect(transfer).toHaveBeenCalledExactlyOnceWith({
      requestId: REQUEST_ID,
    });
  });

  it('should not transfer anything when the page opens without a request id', () => {
    // Given
    const transfer = mockMutationHook(
      mocks.useMePersonalSpaceTransferMutation,
      'success'
    );

    // When
    testRender(<TransferPersonalSpace requestId={null} />);

    // Then
    expect(transfer).not.toHaveBeenCalled();
  });

  it('should go to the application when the transfer succeeds', async () => {
    // Given
    mockMutationHook(mocks.useMePersonalSpaceTransferMutation, 'success');

    // When
    testRender(<TransferPersonalSpace requestId={REQUEST_ID} />);

    // Then
    await waitFor(() =>
      expect(vi.mocked(useRouter)().push).toHaveBeenCalledWith('/app')
    );
  });
});
