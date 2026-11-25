import { SaasProduct } from '../../__generated__/resolvers-types';

const SAAS_PRODUCTS: ReadonlySet<string> = new Set(Object.values(SaasProduct));

// Past this age, SaaS Manager has stopped pushing the instance: the Hub serves metrics it no longer updates.
const SAAS_MANAGER_INSTANCE_STALE_AFTER_MS = 12 * 60 * 60 * 1000;

export const isSaasManagerInstanceStale = (
  generatedAt: Date,
  now: Date
): boolean =>
  now.getTime() - generatedAt.getTime() > SAAS_MANAGER_INSTANCE_STALE_AFTER_MS;

const isSaasProduct = (value: string): value is SaasProduct =>
  SAAS_PRODUCTS.has(value);

/**
 * The product of the Hub SaaS Manager names, whatever its case; null for a product the Hub does not know, which GraphQL
 * would reject.
 */
export const toSaasProduct = (product: string | null): SaasProduct | null => {
  const code = product?.toUpperCase() ?? null;
  return code !== null && isSaasProduct(code) ? code : null;
};
