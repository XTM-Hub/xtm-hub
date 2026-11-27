import UserEventSubscription from '@/components/me/UserEventSubscription';
import type { GraphqlSubscriptionOptions } from '@/hooks/use-graphql-subscription';
import { USER_PROPERTIES_WAIT_MS } from '@/lib/analytics/analytics.consts';
import { clearFiltersStorage } from '@/utils/filters-storage.utils';
import testRender from '@/utils/test/test-render';
import type { MeUserEventsSubscription } from '@graphql/generated';
import { meKeys } from '@graphql/me/me.keys';
import { mockUser } from '@graphql/mocks';
import { QueryClient } from '@tanstack/react-query';
import { act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { afterEach, describe, expect, it, vi } from 'vitest';

const DELETED_USER_ID = 'deleted-user-id';
const EDITED_USER = mockUser({ id: 'user-1', first_name: 'Grace' });

const testState = vi.hoisted(() => ({
  commitLogout: vi.fn(),
  logoutOptions: undefined as { onSuccess: () => void } | undefined,
  subscriptionOptions: undefined as
    GraphqlSubscriptionOptions<MeUserEventsSubscription> | undefined,
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useLogoutMutation: (
    _client: unknown,
    options: (typeof testState)['logoutOptions']
  ) => {
    testState.logoutOptions = options;
    return { mutate: testState.commitLogout };
  },
}));

vi.mock('@/hooks/use-graphql-subscription', () => ({
  useGraphqlSubscription: (
    _document: string,
    _variables: object,
    options: GraphqlSubscriptionOptions<MeUserEventsSubscription>
  ) => {
    testState.subscriptionOptions = options;
  },
}));

vi.mock('@/utils/filters-storage.utils', () => ({
  clearFiltersStorage: vi.fn(),
}));

const receiveEvent = (MeUser: MeUserEventsSubscription['MeUser']) =>
  act(() => {
    testState.subscriptionOptions?.onNext({ MeUser });
  });

const receiveAccountDeletion = () =>
  receiveEvent({ delete: { id: DELETED_USER_ID }, edit: null });

const succeedLogout = () => testState.logoutOptions?.onSuccess();

afterEach(() => {
  vi.useRealTimers();
});

describe('UserEventSubscription', () => {
  it('should clear the filters when the account is deleted even if the logout request fails', () => {
    // Given
    testRender(<UserEventSubscription />);

    // When
    receiveAccountDeletion();

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
      receiveAccountDeletion();
      succeedLogout();

      // When
      await act(() => vi.advanceTimersByTimeAsync(elapsedMs));

      // Then
      expect(vi.mocked(useRouter)().push).toHaveBeenCalledTimes(pushCount);
    }
  );

  it('should give the edited user to the user context when the account is edited', () => {
    // Given
    const queryClient = new QueryClient();
    testRender(<UserEventSubscription />, { queryClient });

    // When
    receiveEvent({ delete: null, edit: EDITED_USER });

    // Then
    expect(queryClient.getQueryData(meKeys.detail())).toEqual({
      me: EDITED_USER,
    });
  });
});
