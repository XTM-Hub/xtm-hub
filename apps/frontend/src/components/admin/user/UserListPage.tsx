import PendingUserList from '@/components/admin/user/pending-user/PendingUserList';
import {
  UserPendingListFragment,
  UserPendingListQuery,
} from '@/components/admin/user/user.graphql';
import UserList from '@/components/admin/user/UserList';
import { PortalContext } from '@/components/me/AppPortalContext';
import { notificationPendingUserQueryFilters } from '@/components/notification/NotificationButton';
import useAdminPath from '@/hooks/use-admin-path';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@filigran/design-system';
import { userPendingList_users$key } from '@generated/userPendingList_users.graphql';
import { userPendingListQuery } from '@generated/userPendingListQuery.graphql';
import { useSearchParams } from 'next/navigation';
import { createContext, useContext, useState } from 'react';
import { useLazyLoadQuery, useRefetchableFragment } from 'react-relay';

interface UserListPageProps {
  organization?: string;
}

interface UserListConnectionContextType {
  connectionID: string;
  setConnectionId: (id: string) => void;
}

// Custom hook to use the ConnectionContext
export const getUserListContext = (): UserListConnectionContextType => {
  const context = useContext(UserListContext);
  if (!context) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
};

const UserListContext = createContext<
  UserListConnectionContextType | undefined
>(undefined);

const UserListPage = ({ organization }: UserListPageProps) => {
  const t = useTranslate();
  const isAdminPath = useAdminPath();
  const { me } = useContext(PortalContext);

  const [connectionID, setConnectionId] = useState<string>('');

  const searchParams = useSearchParams();
  const hasPendingActionParams =
    searchParams.has('action') && searchParams.has('user_id');
  const selectedTab =
    searchParams.has('pendingUsers') || hasPendingActionParams
      ? 'pendingUsers'
      : 'users';

  const queryData = useLazyLoadQuery<userPendingListQuery>(
    UserPendingListQuery,
    notificationPendingUserQueryFilters(me!.selected_organization_id)
  );

  const [data] = useRefetchableFragment<
    userPendingListQuery,
    userPendingList_users$key
  >(UserPendingListFragment, queryData);

  const nbPendingUsers = data.pendingUsers.totalCount;

  return (
    <UserListContext.Provider value={{ connectionID, setConnectionId }}>
      <h1>{t('UserListPage.Title')}</h1>
      {isAdminPath ? (
        <div className="mt-4">
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
    </UserListContext.Provider>
  );
};
// Component export
export default UserListPage;
