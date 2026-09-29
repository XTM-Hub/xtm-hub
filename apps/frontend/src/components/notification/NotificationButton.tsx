import { IndividualIcon, NotificationsIcon } from '@filigran/icon';

import {
  UserPendingListFragment,
  UserPendingListQuery,
  UserPendingListSubscription,
} from '@/components/admin/user/user.graphql';
import { UserFragment } from '@/components/admin/user/UserList';
import { PortalContext } from '@/components/me/AppPortalContext';
import { useTranslate } from '@/hooks/use-translate';
import { APP_PATH } from '@/utils/path/constant';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
} from '@filigran/ui/clients';
import { Button } from '@filigran/ui/servers';
import {
  UserList_fragment$data,
  UserList_fragment$key,
} from '@generated/UserList_fragment.graphql';
import { userPendingList_users$key } from '@generated/userPendingList_users.graphql';
import {
  userPendingListQuery,
  userPendingListQuery$variables,
} from '@generated/userPendingListQuery.graphql';
import {
  userPendingListSubscription,
  userPendingListSubscription$data,
} from '@generated/userPendingListSubscription.graphql';
import Link from 'next/link';
import { useContext, useMemo, useState } from 'react';
import {
  commitLocalUpdate,
  readInlineData,
  useLazyLoadQuery,
  useRefetchableFragment,
  useRelayEnvironment,
  useSubscription,
} from 'react-relay';

export function notificationPendingUserQueryFilters(
  organization_id: string
): userPendingListQuery$variables {
  return {
    count: 20,
    orderMode: 'asc',
    orderBy: 'last_login',
    filters: [{ key: 'organization_id', value: [organization_id] }],
  };
}

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

  const queryData = useLazyLoadQuery<userPendingListQuery>(
    UserPendingListQuery,
    notificationPendingUserQueryFilters(organizationId)
  );

  const [data, refetch] = useRefetchableFragment<
    userPendingListQuery,
    userPendingList_users$key
  >(UserPendingListFragment, queryData);

  const connectionID = data?.pendingUsers?.__id;

  const environment = useRelayEnvironment();

  const pendingUserListSubscriptionConfig = useMemo(
    () => ({
      variables: {
        connections: [connectionID],
        organizationId,
      },
      subscription: UserPendingListSubscription,
      onNext: (
        payload: userPendingListSubscription$data | null | undefined
      ) => {
        if (payload?.UserPending?.invalidate) {
          refetch({}, { fetchPolicy: 'network-only' });
        }
        if (payload?.UserPending?.delete) {
          commitLocalUpdate(environment, (store) => {
            const connection = store.get(connectionID);

            const totalCount = connection?.getValue('totalCount');
            if (totalCount) {
              connection?.setValue((totalCount as number) - 1, 'totalCount');
            }
          });
        }
      },
    }),
    [connectionID, environment, organizationId, refetch]
  );

  useSubscription<userPendingListSubscription>(
    pendingUserListSubscriptionConfig
  );

  const users: UserList_fragment$data[] = data.pendingUsers.edges.map(
    ({ node }) => readInlineData<UserList_fragment$key>(UserFragment, node)
  );

  const nbUsers = data.pendingUsers.totalCount;

  return (
    <Popover
      open={openPopover}
      onOpenChange={setOpenPopover}>
      <PopoverTrigger asChild>
        <Button
          variant="tertiary"
          className="text-primary w-9 px-0 relative">
          <NotificationsIcon className="h-4 w-4" />
          {nbUsers > 0 && (
            <span className="absolute top-2 right-2.5 block h-[6px] w-[6px] transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full"></span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-120 px-0 pt-4 pb-0">
        <span className="px-4">
          {t('Notifications.Title', {
            count: nbUsers,
          })}
        </span>
        <div className="max-h-[300px] overflow-auto mt-4">
          {users.map((user) => (
            <div key={user.id}>
              <Separator className="" />
              <Link
                href={`/${APP_PATH}/manage/user?pendingUsers`}
                onClick={() => setOpenPopover(false)}
                className="flex items-center my-2 px-4">
                <IndividualIcon className="mr-4 h-4 w-4 text-muted-foreground" />
                <div className="">
                  <span className="block text-sm">
                    {t('Notifications.UserNotification.Title')}
                  </span>
                  <span className="block text-xs">
                    {t.rich('Notifications.UserNotification.Text', {
                      nameFormat: (chunk) => (
                        <span className="text-primary">{chunk}</span>
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
