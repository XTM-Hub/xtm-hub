import { PortalCapability } from './__generated__/resolvers-types';
import CapabilityPortal, {
  CapabilityPortalId,
} from './model/kanel/public/CapabilityPortal';
import { OrganizationId } from './model/kanel/public/Organization';
import RolePortal, { RolePortalId } from './model/kanel/public/RolePortal';
import { UserId } from './model/kanel/public/User';
import { PortalContext } from './model/portal-context';

export const PLATFORM_USER_UUID =
  '89efc660-a732-4d71-abe2-455188be1505' as UserId;
export const PLATFORM_USER_EMAIL = 'platform_user@filigran.io';
export const SYSTEM_USER_EMAIL = 'system_user@filigran.io';
export const SYSTEM_USER_UUID: UserId =
  'f0587688-ef35-466a-9f71-a8807ba460b8' as UserId;
export const CRONS_USER_EMAIL = 'crons_user@filigran.io';
export const CRONS_USER_UUID: UserId =
  'a9f49a67-8b37-4f7d-a8bb-c4c0d3c8c7f1' as UserId;
export const MARKETING_USER_EMAIL = 'marketing_user@filigran.io';
export const MARKETING_USER_UUID: UserId =
  '84f72a20-25d3-4cce-b32d-54cb1fb5908f' as UserId;
export const PLATFORM_NAME = 'Filigran';
export const PLATFORM_DOMAIN = ['filigran.io'];
// IdP group carried by the accounts of the Filigran organisation
export const PLATFORM_IDP_GROUP = 'Filigran';
export const PLATFORM_ORGANIZATION_UUID: OrganizationId =
  'ba091095-418f-4b4f-b150-6c9295e232c4' as OrganizationId;
export const ADMIN_UUID: UserId =
  'ba091095-418f-4b4f-b150-6c9295e232c3' as UserId;
export const CAPABILITY_BYPASS: CapabilityPortal = {
  id: '85c9fe6f-901f-4992-a8aa-b8d56a7e2e09' as CapabilityPortalId,
  name: PortalCapability.Bypass,
};

export const ROLE_ADMIN: RolePortal = {
  id: '6b632cf2-9105-46ec-a463-ad59ab58c770' as RolePortalId,
  name: 'ADMIN',
};
export const ROLE_ADMIN_ORGA: RolePortal = {
  id: '40cfe630-c272-42f9-8fcf-f219e2f4278c' as RolePortalId,
  name: 'ADMIN_ORGA',
};
export const ROLE_USER: RolePortal = {
  id: '7a234567-8901-4def-9012-3456789abcde' as RolePortalId,
  name: 'USER',
};

export const PROTECTED_USER_UUIDS: UserId[] = [
  ADMIN_UUID,
  SYSTEM_USER_UUID,
  PLATFORM_USER_UUID,
  CRONS_USER_UUID,
];

export const XTM_HUB_SUPPORT_EMAIL = 'xtm-hub-support@filigran.io';
export const XTM_HUB_DEV_TEAM_EMAIL = '333b4e48.filigran.io@fr.teams.ms';

export const SYSTEM_USER_CONTEXT: PortalContext = {
  user: {
    id: SYSTEM_USER_UUID,
    email: SYSTEM_USER_EMAIL,
    selected_organization_id: PLATFORM_ORGANIZATION_UUID,
    organizations: [
      {
        id: PLATFORM_ORGANIZATION_UUID,
        name: PLATFORM_NAME,
        personal_space: false,
        domains: PLATFORM_DOMAIN,
      },
      {
        id: SYSTEM_USER_UUID,
        name: SYSTEM_USER_EMAIL,
        personal_space: true,
        domains: [],
      },
    ],
    capabilities: [],
    roles_portal: [],
  },
} as unknown as PortalContext;

export const CRONS_USER_CONTEXT: PortalContext = {
  user: {
    id: CRONS_USER_UUID,
    email: CRONS_USER_EMAIL,
    selected_organization_id: PLATFORM_ORGANIZATION_UUID,
    organizations: [
      {
        id: PLATFORM_ORGANIZATION_UUID,
        name: PLATFORM_NAME,
        personal_space: false,
        domains: PLATFORM_DOMAIN,
      },
      {
        id: CRONS_USER_UUID,
        name: CRONS_USER_EMAIL,
        personal_space: true,
        domains: [],
      },
    ],
    capabilities: [],
    roles_portal: [],
  },
} as unknown as PortalContext;

// Identity of token-authenticated marketing exports (e.g. HubSpot), never persisted: no capability, no role, and its own
// personal space as selected organization, which has no subscription, so it only sees public data.
export const MARKETING_USER_CONTEXT: PortalContext = {
  user: {
    id: MARKETING_USER_UUID,
    email: MARKETING_USER_EMAIL,
    selected_organization_id: MARKETING_USER_UUID,
    organizations: [
      {
        id: MARKETING_USER_UUID,
        name: MARKETING_USER_EMAIL,
        personal_space: true,
        domains: [],
      },
    ],
    capabilities: [],
    roles_portal: [],
    selected_org_capabilities: [],
    organization_capabilities: [],
  },
} as unknown as PortalContext;
