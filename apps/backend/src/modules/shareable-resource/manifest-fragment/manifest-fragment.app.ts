import {
  ManifestType,
  PlatformIdentifier,
  PortalCapability,
  type MutationIngestManifestFragmentsArgs,
} from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import { securityGuard } from '../../../security/guard';
import { logApp } from '../../../utils/app-logger.util';
import { getErrorMessage } from '../../../utils/error/error-guard.util';
import { ManifestKey } from '../manifest/manifest.consts';
import { ManifestDomain } from '../manifest/manifest.domain';
import { ManifestHelper } from '../manifest/manifest.helper';
import { ManifestFragmentDomain } from './manifest-fragment.domain';
import { ManifestFragmentHelper } from './manifest-fragment.helper';

export const ManifestFragmentApp = {
  ingestManifestFragments: async ({
    manifestFragments,
  }: MutationIngestManifestFragmentsArgs): Promise<void> => {
    const user = requestContext.requireUser();
    await securityGuard.assertUserPortalCapabilities(user, [
      PortalCapability.ManageManifestIngestions,
    ]);

    if (manifestFragments.length === 0) {
      return;
    }
    // One invalid fragment rejects the batch before any fragment is written.
    for (const fragment of manifestFragments) {
      ManifestFragmentDomain.validateManifestFragment(fragment);
    }
    const minVersion = ManifestFragmentHelper.findMinConnectorVersion(
      manifestFragments.map((fragment) =>
        ManifestFragmentHelper.canonicalizeMinimumVersion(fragment.min_version)
      )
    );
    // min version is null only if there is no fragment to ingest
    if (!minVersion) {
      return;
    }

    const isLts =
      ManifestFragmentHelper.assertHomogeneousLtsBatch(manifestFragments);

    for (const fragment of manifestFragments) {
      await ManifestFragmentDomain.ingestManifestFragment(fragment);
    }

    const impactedManifests =
      await ManifestDomain.loadDistinctManifestsAboveVersion(
        ManifestFragmentHelper.validateAndFormatMinimumVersion(minVersion),
        isLts,
        ManifestType.Connector
      );

    const impactedKeys: ManifestKey[] = impactedManifests.map(
      ({ product, version }) => ({
        platformIdentifier: product as PlatformIdentifier,
        version,
        type: ManifestType.Connector,
      })
    );

    await ManifestDomain.insertIfNotPending(impactedKeys);

    const results = await Promise.allSettled(
      impactedKeys.map((key) => ManifestHelper.scheduleDebouncedRebuild(key))
    );
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logApp.error('[MANIFEST] Failed to schedule debounced rebuild', {
          key: impactedKeys[index],
          error: getErrorMessage(result.reason),
        });
      }
    });
  },
};
