import { PortalContext } from '@/components/me/AppPortalContext';
import { notificationPendingUserQueryFilters } from '@/components/notification/use-notification-pending-users';
import testRender from '@/utils/test/test-render';
import {
  PendingUserEventsDocument,
  PendingUserEventsSubscription,
  PendingUsersQuery,
} from '@graphql/generated';
import { pendingUsersKeys } from '@graphql/user/users.keys';
import { QueryClient } from '@tanstack/react-query';
import { act, screen } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationButton } from './NotificationButton';

type SubscriptionOptions = {
  onNext: (data: PendingUserEventsSubscription) => void;
};

const mocks = vi.hoisted(() => ({
  useNotificationPendingUsers: vi.fn(),
  useGraphqlSubscription: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    onClick,
  }: {
    children: ReactNode;
    href: string;
    onClick?: () => void;
  }) => (
    <a
      href={href}
      onClick={onClick}>
      {children}
    </a>
  ),
}));

vi.mock(
  '@/components/notification/use-notification-pending-users',
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import('@/components/notification/use-notification-pending-users')
    >()),
    useNotificationPendingUsers: mocks.useNotificationPendingUsers,
  })
);

vi.mock('@/hooks/use-graphql-subscription', () => ({
  useGraphqlSubscription: mocks.useGraphqlSubscription,
}));

const ORGANIZATION_ID = 'organization-1';
// The red dot of the bell, shown when there are pending users.
const PENDING_BADGE_SELECTOR = '.bg-feedback-error-primary';

const PENDING_USERS: PendingUsersQuery = {
  pendingUsers: {
    totalCount: 2,
    edges: [
      {
        node: {
          id: 'pending-user-1',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@test.io',
        },
      },
      {
        node: {
          id: 'pending-user-2',
          first_name: 'Jane',
          last_name: 'Doe',
          email: 'jane.doe@test.io',
        },
      },
    ],
  },
};

const SHARED_KEY_INVALIDATION = {
  queryKey: pendingUsersKeys.list(
    notificationPendingUserQueryFilters(ORGANIZATION_ID)
  ),
  exact: true,
};

const lastSubscriptionOptions = () =>
  mocks.useGraphqlSubscription.mock.lastCall?.[2] as SubscriptionOptions;

const renderNotificationButton = (selectedOrganizationId: string | null) => {
  const queryClient = new QueryClient();
  const invalidateQueries = vi
    .spyOn(queryClient, 'invalidateQueries')
    .mockResolvedValue();
  return {
    invalidateQueries,
    ...testRender(
      <PortalContext.Provider
        value={{
          me: selectedOrganizationId
            ? ({
                selected_organization_id: selectedOrganizationId,
              } as { selected_organization_id: string })
            : null,
        }}>
        <NotificationButton />
      </PortalContext.Provider>,
      { queryClient }
    ),
  };
};

describe('NotificationButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useNotificationPendingUsers.mockReturnValue({ data: PENDING_USERS });
    vi.mocked(useTranslations).mockReturnValue(
      Object.assign((key: string) => key, {
        rich: (key: string, values: { name: string }) =>
          `${key}:${values.name}`,
      })
    );
  });

  it('should render nothing when selected organization is missing', () => {
    // Given / When
    renderNotificationButton(null);

    // Then
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should subscribe to the pending user events of the organization', () => {
    // When
    renderNotificationButton(ORGANIZATION_ID);

    // Then
    expect(mocks.useNotificationPendingUsers).toHaveBeenCalledWith(
      ORGANIZATION_ID
    );
    expect(mocks.useGraphqlSubscription).toHaveBeenCalledWith(
      PendingUserEventsDocument,
      { organizationId: ORGANIZATION_ID },
      expect.anything()
    );
  });

  it.each([
    {
      event: 'a pending user is deleted',
      data: {
        UserPending: { delete: { id: 'pending-user-1' }, invalidate: null },
      },
    },
    {
      event: 'the pending users are invalidated',
      data: {
        UserPending: { delete: null, invalidate: { id: ORGANIZATION_ID } },
      },
    },
  ])(
    'should refresh the pending users shared with the tab counter when $event',
    ({ data }) => {
      // Given
      const { invalidateQueries } = renderNotificationButton(ORGANIZATION_ID);

      // When
      act(() => lastSubscriptionOptions().onNext(data));

      // Then
      expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith(
        SHARED_KEY_INVALIDATION
      );
    }
  );

  it('should show the red dot when there are pending users', () => {
    // When
    const { container } = renderNotificationButton(ORGANIZATION_ID);

    // Then
    expect(container.querySelector(PENDING_BADGE_SELECTOR)).toBeInTheDocument();
  });

  it('should show no red dot while the pending users load', () => {
    // Given
    mocks.useNotificationPendingUsers.mockReturnValue({ data: undefined });

    // When
    const { container } = renderNotificationButton(ORGANIZATION_ID);

    // Then
    expect(
      container.querySelector(PENDING_BADGE_SELECTOR)
    ).not.toBeInTheDocument();
  });

  it('should list every pending user with a link to the pending users tab', async () => {
    // Given
    const { user } = renderNotificationButton(ORGANIZATION_ID);

    // When
    await user.click(screen.getByRole('button'));

    // Then
    expect(
      screen.getByText('Notifications.UserNotification.Text:John Doe')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Notifications.UserNotification.Text:Jane Doe')
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });
});
