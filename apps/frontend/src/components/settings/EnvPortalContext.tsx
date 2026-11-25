import { SettingsQuery } from '@graphql/generated';
import * as React from 'react';
import { createContext } from 'react';

export type PortalSettings = SettingsQuery['settings'];

export interface Settings {
  settings?: PortalSettings | null;
}

export interface SettingsProps extends Settings {
  children: React.ReactNode;
}

export const SettingsContext = createContext<Settings>({});

export const generateSettingsContext = (
  settings?: PortalSettings | null
): Settings => {
  return { settings };
};

export const SettingsPortalContext = ({
  children,
  settings,
}: SettingsProps) => {
  return (
    <SettingsContext.Provider value={generateSettingsContext(settings)}>
      {children}
    </SettingsContext.Provider>
  );
};
