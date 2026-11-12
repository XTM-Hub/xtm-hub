import UserEventSubscription from '@/components/me/UserEventSubscription';
import { USER_PROPERTIES_WAIT_MS } from '@/lib/analytics/analytics.consts';
import { clearFiltersStorage } from '@/utils/filters-storage.utils';
import testRender from '@/utils/test/test-render';
import { userMeSubscription$data } from '@generated/userMeSubscription.graphql';
import { QueryClient } from '@tanstack/react-query';
import { act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { GraphQLSubscriptionConfig } from 'relay-runtime';
import { afterEach, describe, expect, it, vi } from 'vitest';

const DELETED_USER_ID = 'deleted-user-id';

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

afterEach(() => {
  vi.useRealTimers();
});

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

  it.each([
    ['stay', USER_PROPERTIES_WAIT_MS - 1, 0],
    ['leave', USER_PROPERTIES_WAIT_MS, 1],
  ])(
    'should %s %s ms after the account is deleted when the analytics user is still refreshing',
    async (_outcome, elapsedMs, pushCount) => {
      // Given
      vi.useFakeTimers();
      vi.spyOn(QueryClient.prototype, 'invalidateQueries').mockReturnValue(
        new Promise(() => undefined)
      );
      testRender(<UserEventSubscription />);
      act(() => {
        testState.subscriptionConfig?.onNext?.({
          MeUser: { delete: DELETED_USER_ID },
        } as unknown as userMeSubscription$data);
      });
      const [{ onCompleted }] = testState.commitLogout.mock.lastCall;
      onCompleted();

      // When
      await act(() => vi.advanceTimersByTimeAsync(elapsedMs));

      // Then
      expect(vi.mocked(useRouter)().push).toHaveBeenCalledTimes(pushCount);
    }
  );
});
