import portalConfig from '../../config';
import { validatePassword } from './user';

export type HashedTokenConfig = {
  hash: string;
  salt: string;
};

export const SYSTEM_TOKEN_HEADER = 'x-xtm-hub-token';
export const MARKETING_TOKEN_HEADER = 'x-xtm-hub-marketing-token';

// Checks a token against its configured hash and salt. An empty hash or salt accepts no token at all.
const isValidHashedToken = (
  token: string | null | undefined,
  { hash, salt }: HashedTokenConfig
): boolean => {
  if (!token || !hash || !salt) {
    return false;
  }
  return validatePassword(salt, token, hash);
};

export const isValidSystemToken = (
  token: string | null | undefined,
  tokenConfig = portalConfig.system_token
): boolean => isValidHashedToken(token, tokenConfig);

// Opens the marketing exports only, so it can be handed to marketing tooling and rotated without the system token.
// Its default hash and salt are the system token ones: set MARKETING_TOKEN_HASH and MARKETING_TOKEN_SALT to give it
// its own value.
export const isValidMarketingToken = (
  token: string | null | undefined,
  tokenConfig = portalConfig.marketing_token
): boolean => isValidHashedToken(token, tokenConfig);
