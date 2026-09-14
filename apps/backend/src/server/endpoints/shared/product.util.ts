import { PlatformIdentifier } from '../../../__generated__/resolvers-types';

/**
 * Shared across the manifest, product-version and versions-matrix endpoints,
 * which all accept a `:product` route param restricted to the platforms
 * known to the PlatformIdentifier enum.
 */
export const isProduct = (value: unknown): value is PlatformIdentifier =>
  typeof value === 'string' &&
  (Object.values(PlatformIdentifier) as string[]).includes(value);
