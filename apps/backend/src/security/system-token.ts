import config from 'config';
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
