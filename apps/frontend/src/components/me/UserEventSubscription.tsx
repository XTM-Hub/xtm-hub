'use client';

import { useGraphqlSubscription } from '@/hooks/use-graphql-subscription';
import { useTranslate } from '@/hooks/use-translate';
import { refreshAnalyticsUser } from '@/lib/analytics/analytics.user';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { clearFiltersStorage } from '@/utils/filters-storage.utils';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { setCurrentUser } from '@/components/me/current-user-query';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  MeUserEventsDocument,
  MeUserEventsSubscription,
  useLogoutMutation,
} from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';
import { commitLocalUpdate, useRelayEnvironment } from 'react-relay';

// Component
const UserEventSubscription = () => {
  const t = useTranslate();
  const router = useRouter();
  const environment = useRelayEnvironment();
  const queryClient = useQueryClient();

  const { mutate: commitLogout } = useLogoutMutation(portalGraphqlClient, {
    onSuccess() {
      commitLocalUpdate(environment, (store) => store.invalidateStore());
      refreshAnalyticsUser().then(() => {
        router.push('/?error=account-deleted');
        router.refresh();
      });
    },
  });

  const logout = () => {
    clearFiltersStorage();
    commitLogout({});
  };

  const [isOpen, setIsOpen] = useState(false);
  useGraphqlSubscription<MeUserEventsSubscription>(
    MeUserEventsDocument,
    {},
    {
      onNext: ({ MeUser }) => {
        if (MeUser?.edit) {
          setCurrentUser(queryClient, MeUser.edit);
          setIsOpen(true);
        } else if (MeUser?.delete) {
          logout();
        }
      },
    }
  );
  return (
    <ConfirmDialog
      confirmAnalyticsId="account_change_notice_close"
      open={isOpen}
      onOpenChange={setIsOpen}
      title={t('UpdateUserDialog.TextUpdatedUserTitle')}
      onConfirm={() => {}}
      hideCancelButton
      confirmLabel={t('Utils.Continue')}>
      <p>{t('UpdateUserDialog.TextUpdatedUser')}</p>
    </ConfirmDialog>
  );
};

// Component export
export default UserEventSubscription;
