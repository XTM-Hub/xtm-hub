import { PlatformIdentifier } from '../../../__generated__/resolvers-types';
import { ManageProductVersionDomain } from '../../../modules/manage-product-version/manage-product-version.domain';
import { ManifestFragmentHelper } from '../../../modules/shareable-resource/manifest-fragment/manifest-fragment.helper';

export type ProductVersionResolution =
  | { ok: true; version: string }
  /** The product has no registered version at all, so nothing to default to. */
  | { ok: false; reason: 'no-registered-version' }
  | { ok: false; reason: 'invalid-format' }
  /** Well-formed, but never registered for this product. */
  | { ok: false; reason: 'unregistered' };

/**
 * Resolves the product version an endpoint should answer for: the `version`
 * query parameter when provided, otherwise the latest version registered for
 * that product.
 *
 * Shared by the versions-matrix and integrations-compatibility endpoints so
 * they can never disagree on what "the latest version" means. The caller maps
 * the failure reasons onto its own error catalogue, since the wording differs
 * per endpoint.
 */
export const resolveRegisteredProductVersion = async (
  product: PlatformIdentifier,
  rawVersion: unknown
): Promise<ProductVersionResolution> => {
  const registeredVersions =
    await ManageProductVersionDomain.loadRegisteredProductVersions(product);

  if (rawVersion === undefined) {
    const version = registeredVersions[0]?.version;
    return version
      ? { ok: true, version }
      : { ok: false, reason: 'no-registered-version' };
  }

  if (typeof rawVersion !== 'string') {
    return { ok: false, reason: 'invalid-format' };
  }

  let paddedVersion: string;
  try {
    paddedVersion =
      ManifestFragmentHelper.validateAndFormatManifestVersion(rawVersion);
  } catch {
    return { ok: false, reason: 'invalid-format' };
  }

  // The comparison uses the padded form, like every other version comparison,
  // so that formatting differences between the request and the registered
  // value (missing zero-padding, LTS suffix casing, ...) can't cause a false
  // "unregistered" result.
  const isRegistered = registeredVersions.some(
    (registered) => registered.version_padded === paddedVersion
  );

  return isRegistered
    ? { ok: true, version: rawVersion }
    : { ok: false, reason: 'unregistered' };
};
