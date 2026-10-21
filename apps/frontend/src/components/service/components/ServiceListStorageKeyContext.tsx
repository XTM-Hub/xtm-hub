import { ServiceListStorageKey } from '@/hooks/use-service-list-storage';
import React, { createContext, useContext } from 'react';

export interface ServiceListStorageKeyContextProps {
  storageKey: ServiceListStorageKey;
}

const ServiceListStorageKeyContext = createContext<
  ServiceListStorageKeyContextProps | undefined
>(undefined);

export const useServiceListStorageKeyContext = () => {
  const context = useContext(ServiceListStorageKeyContext);
  if (!context) {
    throw new Error(
      'useServiceListStorageKey must be used within a ServiceProvider'
    );
  }
  return context;
};

export interface ServiceProps extends ServiceListStorageKeyContextProps {
  children: React.ReactNode;
}

export const AppServiceListStorageKeyContext = ({
  children,
  ...context
}: ServiceProps) => {
  return (
    <ServiceListStorageKeyContext.Provider value={context}>
      {children}
    </ServiceListStorageKeyContext.Provider>
  );
};
