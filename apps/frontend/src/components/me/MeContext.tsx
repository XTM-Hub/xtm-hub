'use client';

import Copilot from '@/components/external/Copilot';
import { AppPortalContext } from '@/components/me/AppPortalContext';
import { toPortalUser } from '@/components/me/portal-user.utils';
import UserEventSubscription from '@/components/me/UserEventSubscription';
import { SettingsContext } from '@/components/settings/EnvPortalContext';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { throwOnFirstLoadError } from '@/lib/query-client';
import { MeQuery, useMeQuery } from '@graphql/generated';
import { meKeys } from '@graphql/me/me.keys';
import { useContext, useMemo } from 'react';

const selectCurrentUser = (data: MeQuery) => data.me;

// Component interface
interface ContextProps {
  children: React.ReactNode;
}

// Component
const MeContext = ({ children }: ContextProps) => {
  const { data: currentUser } = useMeQuery(portalGraphqlClient, undefined, {
    queryKey: meKeys.detail(),
    select: selectCurrentUser,
    throwOnError: throwOnFirstLoadError,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const me = useMemo(
    () => (currentUser ? toPortalUser(currentUser) : null),
    [currentUser]
  );
  const { settings } = useContext(SettingsContext);
  const isProductionSetting =
    settings?.environment && settings.environment === 'production';

  if (currentUser === undefined) {
    return null;
  }

  return (
    <AppPortalContext me={me}>
      <UserEventSubscription />
      {isProductionSetting && <Copilot user={me} />}
      {children}
    </AppPortalContext>
  );
};

// Component export
export default MeContext;
