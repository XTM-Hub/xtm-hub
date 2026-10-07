import { BadRequestErrorCode } from '../../../utils/error/error.code';
import { compareVersions, isLtsVersion } from '../../../utils/versioning';

export const MANIFEST_VERSION_PATTERN = String.raw`(\d+)\.(\d{1,6})\.(\d+)(?:-lts\.(\d+))?`;
const manifestVersionRegex = new RegExp(`^${MANIFEST_VERSION_PATTERN}$`, 'i');
// Minimum versions also accept `-lts` and `-ltsN` (utils/versioning.ts), in any case.
const MINIMUM_LTS_SPELLING = /^(\d+\.\d+\.\d+)-lts(?:\.?(\d+))?$/i;

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

  /** A minimum version in its manifest spelling: `-lts` reads as `-lts.0`, `-ltsN` as `-lts.N`. */
  canonicalizeMinimumVersion: (version: string): string =>
    version
      .trim()
      .replace(
        MINIMUM_LTS_SPELLING,
        (_match, core: string, revision?: string) =>
          `${core}-lts.${revision ?? '0'}`
      ),

  validateAndFormatMinimumVersion: (version: string): string =>
    ManifestFragmentHelper.validateAndFormatManifestVersion(
      ManifestFragmentHelper.canonicalizeMinimumVersion(version)
    ),

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
