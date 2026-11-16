'use client';

import { SettingsPortalContext } from '@/components/settings/EnvPortalContext';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { useSettingsQuery } from '@graphql/generated';
import { settingsKeys } from '@graphql/settings/settings.keys';
import * as React from 'react';

// Component interface
interface ContextProps {
  children: React.ReactNode;
}

// Component
const SettingsContext = ({ children }: ContextProps) => {
  // A failure reaches the nearest error boundary, as the Relay query did.
  const { data } = useSettingsQuery(portalGraphqlClient, undefined, {
    queryKey: settingsKeys.detail(),
    throwOnError: true,
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
