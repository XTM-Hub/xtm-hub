import { DocumentMetadataKeyCode } from '../../../__generated__/resolvers-types';
import { BadRequestErrorCode } from '../../../utils/error/error.code';
import { compareVersions, isLtsVersion } from '../../../utils/versioning';
import { IntegrationCoverageHelper } from '../opencti/integration/integration-coverage/integration-coverage.helper';
import type { StoredIntegrationCoverage } from '../opencti/integration/integration-coverage/integration-coverage.model';

export const MANIFEST_VERSION_PATTERN = String.raw`(\d+)\.(\d{1,6})\.(\d+)(?:-lts\.(\d+))?`;
const manifestVersionRegex = new RegExp(`^${MANIFEST_VERSION_PATTERN}$`, 'i');

export const TAG_LATEST = 'latest';
export const TAG_LATEST_LTS = 'latest-lts';
export const TAG_DECOUPLING = 'decoupling';
export const MAX_SHORT_DESCRIPTION_LENGTH = 250;
export const MAX_CONTACT_LENGTH = 254;

export type ConnectorMetadataSnapshot = {
  datasheet_url?: string;
  blogpost_url?: string;
  demo_url?: string;
};

export type ConnectorCoverageSnapshot = Partial<
  Record<DocumentMetadataKeyCode, unknown>
> & { version_padded?: string };

export const ManifestFragmentHelper = {
  validateAndFormatManifestVersion: (version: string): string => {
    const match = version.match(manifestVersionRegex);
    if (!match) {
      throw new Error(BadRequestErrorCode.InvalidManifestVersionFormat);
    }

    const major = (match[1] ?? '0').padStart(3, '0');
    const datePart = (match[2] ?? '0').padStart(6, '0');
    const patch = (match[3] ?? '0').padStart(3, '0');

    const hasLtsSuffix = /-lts/i.test(version);
    if (!hasLtsSuffix) {
      return `${major}.${datePart}.${patch}`;
    }

    const ltsPatch = (match[4] ?? '0').padStart(3, '0');
    return `${major}.${datePart}.${patch}.LTS.${ltsPatch}`;
  },

  validateShortDescriptionLength: (shortDescription: string): void => {
    if (shortDescription.length > MAX_SHORT_DESCRIPTION_LENGTH) {
      throw new Error(BadRequestErrorCode.ShortDescriptionTooLong);
    }
  },

  validateSolutionCategories: (
    solutionCategories: string[] | null | undefined
  ): void => {
    if (!solutionCategories || solutionCategories.length === 0) {
      throw new Error(BadRequestErrorCode.SolutionCategoriesRequired);
    }
  },

  getLatestTagForConnectorVersion: (formattedVersion: string): string => {
    return formattedVersion.includes('.LTS.') ? TAG_LATEST_LTS : TAG_LATEST;
  },

  isStrictlyGreaterConnectorVersion: ({
    candidate,
    current,
  }: {
    candidate: string;
    current: string;
  }): boolean => {
    if (!current) return true;
    return candidate > current;
  },

  getConnectorMetadataFromExisting: ({
    currentLatestConnector,
    existingBatchConnectors,
  }: {
    currentLatestConnector?: ConnectorMetadataSnapshot;
    existingBatchConnectors: ConnectorMetadataSnapshot[];
  }): ConnectorMetadataSnapshot | undefined => {
    const metadataFromExisting = {
      datasheet_url:
        currentLatestConnector?.datasheet_url ??
        existingBatchConnectors.find((connector) => connector.datasheet_url)
          ?.datasheet_url,
      blogpost_url:
        currentLatestConnector?.blogpost_url ??
        existingBatchConnectors.find((connector) => connector.blogpost_url)
          ?.blogpost_url,
      demo_url:
        currentLatestConnector?.demo_url ??
        existingBatchConnectors.find((connector) => connector.demo_url)
          ?.demo_url,
    };

    if (
      !metadataFromExisting.datasheet_url &&
      !metadataFromExisting.blogpost_url &&
      !metadataFromExisting.demo_url
    ) {
      return undefined;
    }

    return metadataFromExisting;
  },

  /**
   * Declared coverage (manifest or admin) of an earlier version of the same
   * connector. The current latest version is authoritative as soon as it
   * stores coverage: an inferred state there (an admin cleared the declared
   * coverage, or none was ever declared) is kept, older versions are never
   * used to bring a removed declaration back. Older versions, highest first,
   * are only searched when the current latest stores no coverage at all.
   */
  getDeclaredCoverageFromExisting: ({
    currentLatestConnector,
    existingBatchConnectors,
  }: {
    currentLatestConnector?: ConnectorCoverageSnapshot;
    existingBatchConnectors: ConnectorCoverageSnapshot[];
  }): StoredIntegrationCoverage | null => {
    const isDeclared = (
      stored: StoredIntegrationCoverage | null
    ): stored is StoredIntegrationCoverage =>
      !!stored &&
      !stored.inferred &&
      IntegrationCoverageHelper.hasValues(stored);

    const latest = currentLatestConnector
      ? IntegrationCoverageHelper.parseStoredCoverage(currentLatestConnector)
      : null;
    if (latest) {
      return isDeclared(latest) ? latest : null;
    }

    const byVersionDesc = [...existingBatchConnectors].sort((left, right) =>
      (right.version_padded ?? '').localeCompare(left.version_padded ?? '')
    );
    for (const connector of byVersionDesc) {
      const stored = IntegrationCoverageHelper.parseStoredCoverage(connector);
      if (isDeclared(stored)) {
        return stored;
      }
    }
    return null;
  },

  getConnectorDocumentTags: (
    shouldPromoteAsLatest: boolean,
    latestTag: string
  ): string[] => {
    return shouldPromoteAsLatest
      ? [TAG_DECOUPLING, latestTag]
      : [TAG_DECOUPLING];
  },

  findMinConnectorVersion: (versions: string[]): string | undefined => {
    if (versions.length === 0) return undefined;
    return versions.reduce((min, current) =>
      compareVersions(current, min) < 0 ? current : min
    );
  },

  assertHomogeneousLtsBatch: (fragments: { version: string }[]): boolean => {
    const isLts = isLtsVersion(fragments[0]?.version ?? '');
    const hasMixedLtsStatus = fragments.some(
      (fragment) => isLtsVersion(fragment.version) !== isLts
    );
    if (hasMixedLtsStatus) {
      throw new Error(BadRequestErrorCode.MixedLtsManifestFragments);
    }

    return isLts;
  },

  buildConnectorLogoFilename: ({
    title,
    version,
  }: {
    title: string;
    version: string;
  }): string => {
    return `${title}-${version}-logo.png`;
  },

  parseContact: (value: string | null | undefined): string | undefined => {
    const normalized = ManifestFragmentHelper.normalizeOptionalText(value);
    if (normalized !== undefined && normalized.length > MAX_CONTACT_LENGTH) {
      throw new Error(BadRequestErrorCode.ContactTooLong);
    }
    return normalized;
  },

  normalizeOptionalText(value: string | null | undefined): string | undefined {
    if (value === null || value === undefined || value.trim() === '') {
      return undefined;
    }
    return value.trim();
  },
};
