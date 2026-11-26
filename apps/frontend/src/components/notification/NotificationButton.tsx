import { IndividualIcon, NotificationsIcon } from '@filigran/icon';

import { PortalContext } from '@/components/me/AppPortalContext';
import {
  notificationPendingUserQueryFilters,
  useNotificationPendingUsers,
} from '@/components/notification/use-notification-pending-users';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useBatchedInvalidation } from '@/hooks/use-batched-invalidation';
import { useGraphqlSubscription } from '@/hooks/use-graphql-subscription';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { APP_PATH } from '@/utils/path/constant';
import { Button } from '@filigran/design-system';
import {
  PendingUserEventsDocument,
  PendingUserEventsSubscription,
  PendingUserEventsSubscriptionVariables,
} from '@graphql/generated';
import { pendingUsersKeys } from '@graphql/user/users.keys';
import Link from 'next/link';
import { useContext, useState } from 'react';

export const NotificationButton = () => {
  const { me } = useContext(PortalContext);
  const organizationId = me?.selected_organization_id;

  if (!organizationId) {
    return null;
  }

  return <PendingUserNotifications organizationId={organizationId} />;
};

interface PendingUserNotificationsProps {
  organizationId: string;
}

const PendingUserNotifications = ({
  organizationId,
}: PendingUserNotificationsProps) => {
  const t = useTranslate();
  const [openPopover, setOpenPopover] = useState(false);

  const { data } = useNotificationPendingUsers(organizationId);

  // The bell and the pending users tab counter share this query, as they
  // shared the Relay record: both follow a deletion or an invalidation.
  // Batched, as a bulk accept sends one deletion per user.
  const refreshPendingUsers = useBatchedInvalidation({
    queryKey: pendingUsersKeys.list(
      notificationPendingUserQueryFilters(organizationId)
    ),
    exact: true,
  });
  useGraphqlSubscription<
    PendingUserEventsSubscription,
    PendingUserEventsSubscriptionVariables
  >(
    PendingUserEventsDocument,
    { organizationId },
    {
      onNext: ({ UserPending }) => {
        if (UserPending?.delete || UserPending?.invalidate) {
          refreshPendingUsers();
        }
      },
    }
  );

  const users = data?.pendingUsers.edges.map(({ node }) => node) ?? [];
  const nbUsers = data?.pendingUsers.totalCount ?? 0;

  return (
    <Popover
      open={openPopover}
      onOpenChange={setOpenPopover}>
      <PopoverTrigger asChild>
        <Button
          {...analyticsId('notification_panel_open')}
          priority="tertiary"
          className="w-9 px-0 relative">
          <NotificationsIcon className="h-4 w-4" />
          {nbUsers > 0 && (
            <span className="absolute top-2 right-2.5 block h-[6px] w-[6px] transform translate-x-1/2 -translate-y-1/2 bg-feedback-error-primary rounded-full"></span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        padding={0}
        className="w-120 pt-4">
        <span className="px-4">
          {t('Notifications.Title', {
            count: nbUsers,
          })}
        </span>
        <div className="max-h-[300px] overflow-auto mt-4">
          {users.map((user) => (
            <div key={user.id}>
              <Separator />
              <Link
                {...analyticsId('notification_pending_user_open')}
                href={`/${APP_PATH}/manage/user?pendingUsers`}
                onClick={() => setOpenPopover(false)}
                className="flex items-center my-2 px-4">
                <IndividualIcon className="mr-4 h-4 w-4 text-icon-subtle" />
                <div className="">
                  <span className="block text-sm">
                    {t('Notifications.UserNotification.Title')}
                  </span>
                  <span className="block text-xs">
                    {t.rich('Notifications.UserNotification.Text', {
                      nameFormat: (chunk) => (
                        <span className="text-filigran-brand-primary">
                          {chunk}
                        </span>
                      ),
                      name: `${user.first_name} ${user.last_name}`,
                    })}
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
