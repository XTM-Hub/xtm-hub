import { IntegrationType } from '../../../__generated__/resolvers-types';
import { ManifestFragmentHelper } from '../../../modules/shareable-resource/manifest-fragment/manifest-fragment.helper';

/**
 * Why a requested integration version has no, or no positive, answer.
 *
 * Each value names the *problem*, not the field that produced it, so a caller
 * can act on it without reading the documentation.
 */
export const INTEGRATION_INCOMPATIBILITY_REASONS = {
  /** The connector requires a newer OpenCTI than the one asked about. */
  OpenctiVersionTooOld: 'opencti_version_too_old',
  /** LTS connectors only deploy on LTS OpenCTI, and vice versa. */
  LtsTrackMismatch: 'lts_track_mismatch',
  /** No integration at all carries this slug. */
  UnknownIntegrationSlug: 'unknown_integration_slug',
  /** The slug exists as a connector, but not at that version. */
  UnknownIntegrationVersion: 'unknown_integration_version',
  /** The connector version exists but is retired. */
  IntegrationDecommissioned: 'integration_decommissioned',
  /**
   * The slug exists but is not a connector. Only connectors are versioned
   * today, so a version compatibility question cannot be answered for it.
   */
  IntegrationTypeNotSupported: 'integration_type_not_supported',
} as const;

export type IntegrationIncompatibilityReason =
  (typeof INTEGRATION_INCOMPATIBILITY_REASONS)[keyof typeof INTEGRATION_INCOMPATIBILITY_REASONS];

export type IntegrationVersionPair = {
  slug: string;
  version: string;
  versionPadded: string;
};

export type IntegrationVersionsParseResult =
  | { ok: true; pairs: IntegrationVersionPair[] }
  | { ok: false; reason: 'missing' | 'invalid' };

/**
 * Parses the `integration_versions` query parameter, a comma-separated list
 * of `slug@version` pairs.
 *
 * Slugs are matched case-sensitively (like every other slug lookup) and are
 * split on the *last* "@", so a slug containing one is still parsed correctly.
 * Duplicate pairs collapse, but the same slug at two different versions is
 * legitimate — asking which of two candidates fits is a real use case.
 *
 * A malformed entry fails the whole request rather than being reported per
 * entry: unlike "is this a connector?", the caller cannot have believed a
 * syntactically broken pair was valid.
 */
export const parseIntegrationVersions = (
  raw: unknown
): IntegrationVersionsParseResult => {
  if (raw === undefined) return { ok: false, reason: 'missing' };
  if (typeof raw !== 'string') return { ok: false, reason: 'invalid' };

  const items = raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (items.length === 0) return { ok: false, reason: 'invalid' };

  const pairs: IntegrationVersionPair[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const separatorIndex = item.lastIndexOf('@');
    if (separatorIndex <= 0 || separatorIndex === item.length - 1) {
      return { ok: false, reason: 'invalid' };
    }

    const slug = item.slice(0, separatorIndex).trim();
    const version = item.slice(separatorIndex + 1).trim();
    if (slug.length === 0 || version.length === 0) {
      return { ok: false, reason: 'invalid' };
    }

    let versionPadded: string;
    try {
      versionPadded =
        ManifestFragmentHelper.validateAndFormatManifestVersion(version);
    } catch {
      return { ok: false, reason: 'invalid' };
    }

    const key = `${slug}@${versionPadded}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push({ slug, version, versionPadded });
  }

  return { ok: true, pairs };
};

/** The subset of a connector document the compatibility verdict depends on. */
export type CompatibilityCandidate = {
  version_padded: string;
  active: boolean;
  is_decommissioned: boolean;
  minimum_deployable_version?: string | undefined;
  minimum_deployable_version_padded?: string | undefined;
};

export type IntegrationCompatibilityEntry = {
  slug: string;
  integration_version: string;
  /**
   * Absent when the question cannot be answered at all — an unknown slug, an
   * unknown version, or a non-connector integration. Neither `true` nor
   * `false` would be honest there: `false` would block a deployment that is
   * actually fine, `true` would vouch for something never verified.
   */
  compatible?: boolean;
  integration_type?: string;
  incompatibility_reason?: IntegrationIncompatibilityReason;
  minimum_deployable_version?: string;
  latest_compatible_integration_version?: string;
};

export const isLtsPaddedVersion = (versionPadded: string): boolean =>
  versionPadded.includes('.LTS.');

export type ClassifyIntegrationInput = {
  pair: IntegrationVersionPair;
  productVersionPadded: string;
  productIsLts: boolean;
  /** Undefined when no document carries this slug. */
  integrationType: string | undefined;
  /** Undefined when no connector matches the slug at that exact version. */
  candidate: CompatibilityCandidate | undefined;
  /** Newest version of this slug compatible with the resolved OpenCTI version. */
  latestCompatibleVersion: string | undefined;
};

/**
 * Turns one requested `slug@version` pair into its verdict.
 *
 * The checks are ordered from "cannot answer" to "can answer", so the most
 * specific explanation always wins: reporting an unknown slug as merely
 * incompatible, or a decommissioned connector as an unknown version, would
 * send the caller looking in the wrong place.
 */
export const classifyIntegrationCompatibility = ({
  pair,
  productVersionPadded,
  productIsLts,
  integrationType,
  candidate,
  latestCompatibleVersion,
}: ClassifyIntegrationInput): IntegrationCompatibilityEntry => {
  const base = { slug: pair.slug, integration_version: pair.version };

  if (integrationType === undefined) {
    return {
      ...base,
      incompatibility_reason:
        INTEGRATION_INCOMPATIBILITY_REASONS.UnknownIntegrationSlug,
    };
  }

  if (integrationType !== IntegrationType.Connector) {
    return {
      ...base,
      integration_type: integrationType,
      incompatibility_reason:
        INTEGRATION_INCOMPATIBILITY_REASONS.IntegrationTypeNotSupported,
    };
  }

  const withLatest = {
    ...base,
    ...(latestCompatibleVersion !== undefined && {
      latest_compatible_integration_version: latestCompatibleVersion,
    }),
  };

  if (candidate === undefined) {
    return {
      ...withLatest,
      incompatibility_reason:
        INTEGRATION_INCOMPATIBILITY_REASONS.UnknownIntegrationVersion,
    };
  }

  if (!candidate.active || candidate.is_decommissioned) {
    return {
      ...withLatest,
      compatible: false,
      incompatibility_reason:
        INTEGRATION_INCOMPATIBILITY_REASONS.IntegrationDecommissioned,
    };
  }

  if (isLtsPaddedVersion(candidate.version_padded) !== productIsLts) {
    return {
      ...withLatest,
      compatible: false,
      incompatibility_reason:
        INTEGRATION_INCOMPATIBILITY_REASONS.LtsTrackMismatch,
    };
  }

  const minimumPadded = candidate.minimum_deployable_version_padded;
  if (minimumPadded !== undefined && minimumPadded > productVersionPadded) {
    return {
      ...withLatest,
      compatible: false,
      incompatibility_reason:
        INTEGRATION_INCOMPATIBILITY_REASONS.OpenctiVersionTooOld,
      ...(candidate.minimum_deployable_version !== undefined && {
        minimum_deployable_version: candidate.minimum_deployable_version,
      }),
    };
  }

  return { ...withLatest, compatible: true };
};

export type IntegrationsCompatibilityBody = {
  opencti_version: string;
  integrations: IntegrationCompatibilityEntry[];
};

/**
 * The resolved OpenCTI version is echoed back so that an answer obtained
 * without an explicit `version` (i.e. "the latest") stays reproducible.
 */
export const buildIntegrationsCompatibilityBody = (
  productVersion: string,
  integrations: IntegrationCompatibilityEntry[]
): IntegrationsCompatibilityBody => ({
  opencti_version: productVersion,
  integrations,
});
