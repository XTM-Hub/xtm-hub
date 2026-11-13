import { validatePassword } from './user';

export type HashedTokenConfig = {
  hash: string;
  salt: string;
};

// Checks a token against its configured hash and salt. An empty hash or salt accepts no token at all.
export const isValidHashedToken = (
  token: string | null | undefined,
  { hash, salt }: HashedTokenConfig
): boolean => {
  if (!token || !hash || !salt) {
    return false;
  }
  return validatePassword(salt, token, hash);
};
