import { PortalUser } from '@/components/me/portal-user.utils';
import { OrganizationCapability, PortalCapability } from '@graphql/generated';
import * as React from 'react';
import { createContext } from 'react';

export interface Portal {
  me?: PortalUser | null;
  isPersonalSpace?: boolean;
  hasCapability?: (capability: PortalCapability) => boolean;
  hasOrganizationCapability?: (capability: OrganizationCapability) => boolean;
}

export interface PortalProps extends Portal {
  children: React.ReactNode;
}

export const PortalContext = createContext<Portal>({});

export const generatePortalContext = (me?: PortalUser | null): Portal => {
  return {
    me,
    isPersonalSpace:
      me?.organizations?.some(
        (org) => org.personal_space && org.id === me?.selected_organization_id
      ) ?? false,
    hasCapability: (capability: PortalCapability) => {
      const userCapabilities = (me?.capabilities ?? []).map((c) => c?.name);
      return (
        userCapabilities.includes(PortalCapability.Bypass) ||
        userCapabilities.includes(capability)
      );
    },
    hasOrganizationCapability: (capability: OrganizationCapability) => {
      return (me?.selected_org_capabilities ?? []).includes(capability);
    },
  };
};

export const AppPortalContext = ({ children, me }: PortalProps) => {
  return (
    <PortalContext.Provider value={generatePortalContext(me)}>
      {children}
    </PortalContext.Provider>
  );
};
