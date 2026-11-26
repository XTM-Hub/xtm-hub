'use client';

import { SettingsPortalContext } from '@/components/settings/EnvPortalContext';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { throwOnFirstLoadError } from '@/lib/query-client';
import { useSettingsQuery } from '@graphql/generated';
import { settingsKeys } from '@graphql/settings/settings.keys';
import * as React from 'react';

// Component interface
interface ContextProps {
  children: React.ReactNode;
}

// Component
const SettingsContext = ({ children }: ContextProps) => {
  const { data } = useSettingsQuery(portalGraphqlClient, undefined, {
    queryKey: settingsKeys.detail(),
    throwOnError: throwOnFirstLoadError,
  });

  // The children read the settings on their first render: wait for them.
  if (!data) {
    return null;
  }

  return (
    <SettingsPortalContext settings={data.settings}>
      {children}
    </SettingsPortalContext>
  );
};

// Component export
export default SettingsContext;
