import config from 'config';
import { v4 as uuidv4 } from 'uuid';
import {
  OrganizationCapability,
  PortalCapability,
} from '../__generated__/resolvers-types';
import { CapabilityPortalId } from '../model/kanel/public/CapabilityPortal';
import Organization from '../model/kanel/public/Organization';
import { UserLoadUserBy } from '../model/user';
import {
  PLATFORM_USER_EMAIL,
  PLATFORM_USER_UUID,
  SYSTEM_USER_CONTEXT,
} from '../portal.const';
import { validatePassword } from './util/user';

export const SYSTEM_TOKEN_HEADER = 'x-xtm-hub-token';
const SYSTEM_TOKEN_HASH = config.get<string>('system_token_hash');
const SYSTEM_TOKEN_SALT = config.get<string>('system_token_salt');

export const isValidSystemToken = (token: string | null): boolean => {
  if (!token) {
    return false;
  }
  return validatePassword(SYSTEM_TOKEN_SALT, token, SYSTEM_TOKEN_HASH);
};

export const buildScopedSystemUser = (
  requiredCapabilities: PortalCapability[] = []
): UserLoadUserBy => {
  const scopedPortalCapabilities = requiredCapabilities.map((name) => ({
    // Not a database row: the scoped capability gets a synthetic id
    id: `system-token-${name}` as CapabilityPortalId,
    name,
  }));

  return {
    ...SYSTEM_USER_CONTEXT.user,
    capabilities: scopedPortalCapabilities,
    selected_org_capabilities: [],
    organization_capabilities: [],
  };
};

export const buildPlatformUser = (
  organization: Organization
): UserLoadUserBy => ({
  id: PLATFORM_USER_UUID,
  email: PLATFORM_USER_EMAIL,
  salt: '',
  password: '',
  first_name: null,
  last_name: null,
  selected_organization_id: organization.id,
  picture: null,
  disabled: false,
  last_login: null,
  country: null,
  platform_token: null,
  picture_minio: null,
  selected_language: 'en',
  status: null,
  invitation_date: null,
  has_replied_satisfaction: null,
  idp_subject: null,
  organizations: [organization],
  capabilities: [],
  roles_portal: [],
  organization_capabilities: [
    {
      id: uuidv4(),
      organization,
      capabilities: [OrganizationCapability.ManagePlatformRegistration],
    },
  ],
  selected_org_capabilities: [
    OrganizationCapability.ManagePlatformRegistration,
  ],
});
