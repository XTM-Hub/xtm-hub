import PendingUserList from '@/components/admin/user/pending-user/PendingUserList';
import UserList from '@/components/admin/user/UserList';
import Loader from '@/components/Loader';
import { PortalContext } from '@/components/me/AppPortalContext';
import { useNotificationPendingUsers } from '@/components/notification/use-notification-pending-users';
import useAdminPath from '@/hooks/use-admin-path';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@filigran/design-system';
import { useSearchParams } from 'next/navigation';
import { useContext } from 'react';

interface UserListPageProps {
  organization?: string;
}

const UserListPage = ({ organization }: UserListPageProps) => {
  const t = useTranslate();
  const isAdminPath = useAdminPath();
  const { me } = useContext(PortalContext);

  const searchParams = useSearchParams();
  const hasPendingActionParams =
    searchParams.has('action') && searchParams.has('user_id');
  const selectedTab =
    searchParams.has('pendingUsers') || hasPendingActionParams
      ? 'pendingUsers'
      : 'users';

  // Shared with the bell. The admin path shows no pending users tab.
  const { data } = useNotificationPendingUsers(me!.selected_organization_id, {
    enabled: !isAdminPath,
  });

  // The page waits for the pending users count, as it did when the Relay
  // query suspended it.
  if (!isAdminPath && !data) {
    return <Loader />;
  }

  const nbPendingUsers = data?.pendingUsers.totalCount ?? 0;

  return (
    <>
      {!isAdminPath && <h1>{t('UserListPage.Title')}</h1>}
      {isAdminPath ? (
        <div>
          <UserList organization={organization} />
        </div>
      ) : (
        <Tabs defaultValue={selectedTab}>
          <TabsList>
            <TabsTrigger
              value="users"
              {...analyticsId('organization_members_select')}>
              {t('UserListPage.TabTitle')}
            </TabsTrigger>
            <TabsTrigger
              value="pendingUsers"
              disabled={!nbPendingUsers}
              {...analyticsId('organization_join_requests_select')}>
              {t('PendingUserListPage.TabTitle', {
                usersCount: nbPendingUsers,
              })}
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="users"
            className="pt-4">
            <UserList organization={organization} />
          </TabsContent>
          <TabsContent
            value="pendingUsers"
            className="pt-4">
            {organization && <PendingUserList organization={organization} />}
          </TabsContent>
        </Tabs>
      )}
    </>
  );
};
// Component export
export default UserListPage;
