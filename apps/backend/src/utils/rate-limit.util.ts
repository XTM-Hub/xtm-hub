import { type Options, MemoryStore } from 'express-rate-limit';
import { BlockList, isIP } from 'node:net';

export interface KeyRateLimiter {
  /** Counts one hit for the key and tells whether it is still within the limit. */
  tryConsume: (key: string) => Promise<boolean>;
  reset: () => Promise<void>;
}

/**
 * A fixed-window limiter for code that is not an Express route, such as a GraphQL resolver. The store is in memory,
 * so each API replica allows its own hits per window.
 */
export const createKeyRateLimiter = ({
  windowMs,
  limit,
}: {
  windowMs: number;
  limit: number;
}): KeyRateLimiter => {
  const store = new MemoryStore();
  store.init({ windowMs } as Options);
  return {
    tryConsume: async (key) => (await store.increment(key)).totalHits <= limit,
    reset: () => store.resetAll(),
  };
};

const privateAddresses = new BlockList();
privateAddresses.addSubnet('10.0.0.0', 8, 'ipv4');
privateAddresses.addSubnet('100.64.0.0', 10, 'ipv4');
privateAddresses.addSubnet('127.0.0.0', 8, 'ipv4');
privateAddresses.addSubnet('169.254.0.0', 16, 'ipv4');
privateAddresses.addSubnet('172.16.0.0', 12, 'ipv4');
privateAddresses.addSubnet('192.168.0.0', 16, 'ipv4');
privateAddresses.addAddress('::1', 'ipv6');
privateAddresses.addSubnet('fc00::', 7, 'ipv6');
privateAddresses.addSubnet('fe80::', 10, 'ipv6');

const IPV4_MAPPED_PREFIX = '::ffff:';

/**
 * Tells whether a request comes from inside the network rather than from a client: the frontend server rendering a
 * page, or a proxy when `trust proxy` does not match the deployment. A missing address counts as private.
 */
export const isPrivateIp = (ip: string | undefined): boolean => {
  if (!ip) {
    return true;
  }
  const address = ip.toLowerCase().startsWith(IPV4_MAPPED_PREFIX)
    ? ip.slice(IPV4_MAPPED_PREFIX.length)
    : ip;
  const family = isIP(address);
  if (family === 0) {
    return false;
  }
  return privateAddresses.check(address, family === 4 ? 'ipv4' : 'ipv6');
};
