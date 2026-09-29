import { AddUser } from '@/components/admin/user/forms/AddUser';
import { AdminAddUser } from '@/components/admin/user/forms/admin/AdminAddUser';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@filigran/ui';
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
      <div className="flex justify-between">
        <h1>{t('UserListPage.Title')}</h1>
        <div className="col-md-6 text-right">
          {isAdminPath ? <AdminAddUser /> : <AddUser />}
        </div>
      </div>
      {isAdminPath ? (
        <div className="mt-4">
          <UserList organization={organization} />
        </div>
      ) : (
        <Tabs
          defaultValue={selectedTab}
          className="">
          <TabsList>
            <TabsTrigger value="users">
              {t('UserListPage.TabTitle')}
            </TabsTrigger>
            <TabsTrigger
              value="pendingUsers"
              disabled={!nbPendingUsers}>
              {t('PendingUserListPage.TabTitle', {
                usersCount: nbPendingUsers,
              })}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="users">
            <UserList organization={organization} />
          </TabsContent>
          <TabsContent value="pendingUsers">
            {organization && <PendingUserList organization={organization} />}
          </TabsContent>
        </Tabs>
      )}
    </UserListContext.Provider>
  );
};
// Component export
export default UserListPage;
