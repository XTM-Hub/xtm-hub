import portalConfig from '../../config';
import { validatePassword } from './user';

export const MARKETING_TOKEN_HEADER = 'x-xtm-hub-marketing-token';

// Opens the marketing exports only, so it can be handed to marketing tooling and rotated without the system token.
// No default value: an environment that does not configure it accepts no marketing token at all.
export const isValidMarketingToken = (
  token: string | null | undefined,
  { hash, salt } = portalConfig.marketing_token
): boolean => {
  if (!token || !hash || !salt) {
    return false;
  }
  return validatePassword(salt, token, hash);
};
