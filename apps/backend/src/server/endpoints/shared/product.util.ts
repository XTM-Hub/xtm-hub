import { PlatformIdentifier } from '../../../__generated__/resolvers-types';

/**
 * Shared across the manifest, product-version and versions-matrix endpoints,
 * which all accept a `:product` route param restricted to the platforms
 * known to the PlatformIdentifier enum.
 */
export const isProduct = (value: unknown): value is PlatformIdentifier =>
  typeof value === 'string' &&
  (Object.values(PlatformIdentifier) as string[]).includes(value);

export type OpenctiOnlyProductResolution =
  | { ok: true; product: PlatformIdentifier }
  | { ok: false; reason: 'invalid' | 'unsupported' };

/**
 * Connector compatibility data only exists for OpenCTI today, so any other
 * (valid) product identifier is accepted by the `:product` route param but
 * rejected here rather than silently returning an empty/misleading answer.
 *
 * Shared by the versions-matrix and integrations-compatibility endpoints; the
 * caller maps the reasons onto its own error catalogue.
 */
export const resolveOpenctiOnlyProduct = (
  rawProduct: unknown
): OpenctiOnlyProductResolution => {
  if (!isProduct(rawProduct)) {
    return { ok: false, reason: 'invalid' };
  }
  if (rawProduct !== PlatformIdentifier.Opencti) {
    return { ok: false, reason: 'unsupported' };
  }
  return { ok: true, product: rawProduct };
};
