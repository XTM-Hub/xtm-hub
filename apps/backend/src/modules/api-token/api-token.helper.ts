import { createHash, randomBytes } from 'node:crypto';

// A personal API token: `xhp_` then 32 random bytes in base64url (43 characters). The prefix lets secret scanning
// recognise a leaked token; the XTM One connector checks the same shape.
export const API_TOKEN_PREFIX = 'xhp_';
const API_TOKEN_RE = /^xhp_[A-Za-z0-9_-]{43}$/;
// Characters of the secret after the prefix kept in clear, to tell tokens apart in a list
const DISPLAYED_PREFIX_LENGTH = 6;
// A token lives one year at most
export const API_TOKEN_MAX_LIFETIME_MS = 366 * 24 * 60 * 60 * 1000;

export const ApiTokenHelper = {
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

export interface LastUseThrottle {
  // True when the use at `nowMs` should be written: the first one of the id, or the first after the interval
  shouldRecord: (id: string, nowMs: number) => boolean;
  size: () => number;
}

/**
 * Remembers when each token's last use was written, to write it once per interval at most. Bounded: an entry older
 * than the interval is pruned on the next call, as it would let the next write through anyway, and past `maxEntries`
 * the oldest entries are evicted, which costs at most one extra write each. Entries are kept in the order they were
 * written (a rewrite moves the entry to the end), so both prunes stop at the first entry they keep.
 */
export const createLastUseThrottle = ({
  intervalMs,
  maxEntries,
}: {
  intervalMs: number;
  maxEntries: number;
}): LastUseThrottle => {
  const writes = new Map<string, number>();

  const pruneExpired = (nowMs: number) => {
    for (const [id, writtenAt] of writes) {
      if (nowMs - writtenAt < intervalMs) {
        return;
      }
      writes.delete(id);
    }
  };

  const evictOverflow = () => {
    for (const id of writes.keys()) {
      if (writes.size <= maxEntries) {
        return;
      }
      writes.delete(id);
    }
  };

  return {
    shouldRecord: (id, nowMs) => {
      pruneExpired(nowMs);
      const last = writes.get(id);
      if (last !== undefined && nowMs - last < intervalMs) {
        return false;
      }
      writes.delete(id);
      writes.set(id, nowMs);
      evictOverflow();
      return true;
    },
    size: () => writes.size,
  };
};
