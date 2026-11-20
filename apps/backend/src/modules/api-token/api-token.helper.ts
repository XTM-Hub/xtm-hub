import type { Response } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import {
  UnauthenticatedErrorCode,
  UnknownErrorCode,
} from '../../utils/error/error.code';

// The errors the token middlewares answer themselves, before GraphQL runs
export type ApiTokenErrorCode =
  UnauthenticatedErrorCode.Unauthenticated | UnknownErrorCode.UnknownError;

// A personal API token: `xhp_` then 32 random bytes in base64url (43 characters). The prefix lets secret scanning
// recognise a leaked token; the XTM One connector checks the same shape.
export const API_TOKEN_PREFIX = 'xhp_';
const API_TOKEN_RE = /^xhp_[A-Za-z0-9_-]{43}$/;
// Characters of the secret after the prefix kept in clear, to tell tokens apart in a list
const DISPLAYED_PREFIX_LENGTH = 6;
// A token lives one year at most
export const API_TOKEN_MAX_LIFETIME_MS = 366 * 24 * 60 * 60 * 1000;

export const ApiTokenHelper = {
  // Same shape as a GraphQL error: an API token client reads JSON, whatever the route and the failure
  sendError: (res: Response, status: number, code: ApiTokenErrorCode) => {
    res
      .status(status)
      .json({ errors: [{ message: code, extensions: { code } }] });
  },

  generate: (): { token: string; tokenPrefix: string; tokenHash: string } => {
    const token = `${API_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
    return {
      token,
      tokenPrefix: token.slice(
        0,
        API_TOKEN_PREFIX.length + DISPLAYED_PREFIX_LENGTH
      ),
      tokenHash: ApiTokenHelper.hash(token),
    };
  },

  // The secret is 32 random bytes: a fast hash is enough, nothing can be guessed from it
  hash: (token: string): string =>
    createHash('sha256').update(token, 'utf8').digest('hex'),

  isWellFormed: (token: string): boolean => API_TOKEN_RE.test(token),

  // The token of an `Authorization: Bearer xhp_...` header, or null when the header carries no API token
  fromAuthorizationHeader: (header: unknown): string | null => {
    if (typeof header !== 'string') {
      return null;
    }
    const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
    if (!match?.[1]?.startsWith(API_TOKEN_PREFIX)) {
      return null;
    }
    return match[1];
  },
};
