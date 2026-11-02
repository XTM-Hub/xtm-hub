import UserEventSubscription from '@/components/me/UserEventSubscription';
import { clearFiltersStorage } from '@/utils/filters-storage.utils';
import testRender from '@/utils/test/test-render';
import { userMeSubscription$data } from '@generated/userMeSubscription.graphql';
import { act } from '@testing-library/react';
import { GraphQLSubscriptionConfig } from 'relay-runtime';
import { describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  commitLogout: vi.fn(),
  subscriptionConfig: undefined as
    | GraphQLSubscriptionConfig<{
        variables: object;
        response: userMeSubscription$data;
      }>
    | undefined,
}));

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-relay')>()),
  useMutation: () => [testState.commitLogout, false],
  useSubscription: (
    config: NonNullable<(typeof testState)['subscriptionConfig']>
  ) => {
    testState.subscriptionConfig = config;
  },
}));

vi.mock('@/utils/filters-storage.utils', () => ({
  clearFiltersStorage: vi.fn(),
}));

describe('UserEventSubscription', () => {
  it('should clear the filters when the account is deleted even if the logout request fails', () => {
    // Given
    testRender(<UserEventSubscription />);

    // When
    act(() => {
      testState.subscriptionConfig?.onNext?.({
        MeUser: { delete: 'deleted-user-id' },
      } as unknown as userMeSubscription$data);
    });

    // Then
    expect(testState.commitLogout).toHaveBeenCalledOnce();
    expect(clearFiltersStorage).toHaveBeenCalledOnce();
  });
});
