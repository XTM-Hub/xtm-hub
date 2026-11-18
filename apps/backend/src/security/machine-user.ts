import config from 'config';
import { PortalCapability } from '../__generated__/resolvers-types';
import { CapabilityPortalId } from '../model/kanel/public/CapabilityPortal';
import { UserLoadUserBy } from '../model/user';
import { SYSTEM_USER_CONTEXT } from '../portal.const';
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
