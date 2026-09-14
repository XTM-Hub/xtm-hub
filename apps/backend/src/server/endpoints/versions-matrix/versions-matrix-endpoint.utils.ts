import crypto from 'node:crypto';
import type { ConnectorV2 } from '../../../modules/shareable-resource/opencti/integration/integration.model';

export const VERSIONS_MATRIX_FORMATS = ['json', 'env', 'csv'] as const;

export type VersionsMatrixFormat = (typeof VERSIONS_MATRIX_FORMATS)[number];

export const isVersionsMatrixFormat = (
  value: unknown
): value is VersionsMatrixFormat =>
  typeof value === 'string' &&
  (VERSIONS_MATRIX_FORMATS as readonly string[]).includes(value);

/**
 * Returns the requested format, defaulting to "json" when the query
 * parameter is absent, or undefined when it is present but not recognized.
 */
export const parseVersionsMatrixFormat = (
  raw: unknown
): VersionsMatrixFormat | undefined => {
  if (raw === undefined) return 'json';
  return isVersionsMatrixFormat(raw) ? raw : undefined;
};

export type ConnectorSlugsParseResult =
  // slugs is undefined when connector_slugs was omitted, meaning "all connectors".
  { ok: true; slugs: string[] | undefined } | { ok: false };

export const parseConnectorSlugs = (
  raw: unknown
): ConnectorSlugsParseResult => {
  if (raw === undefined) return { ok: true, slugs: undefined };
  if (typeof raw !== 'string') return { ok: false };

  // Slugs are matched case-sensitively (same as
  // DocumentDomain.loadBestCompatibleConnectorsBySlugs), since connector
  // slugs are not guaranteed to be lowercase.
  const slugs = Array.from(
    new Set(
      raw
        .split(',')
        .map((slug) => slug.trim())
        .filter((slug) => slug.length > 0)
    )
  );

  if (slugs.length === 0) return { ok: false };

  return { ok: true, slugs };
};

/** Connector slugs may contain dashes, which aren't valid in JSON/env key names. */
export const buildConnectorFieldSlug = (slug: string): string =>
  slug.replace(/-/g, '_');

export const buildConnectorJsonKey = (slug: string): string =>
  `connector_${buildConnectorFieldSlug(slug)}_version`;

export const buildConnectorEnvKey = (slug: string): string =>
  `CONNECTOR_${buildConnectorFieldSlug(slug).toUpperCase()}_VERSION`;

export type VersionsMatrixEntry = { slug: string; version: string };

/**
 * Slugs explicitly requested by the caller that aren't known at all (i.e.
 * don't exist as a decoupled connector), regardless of OpenCTI version
 * compatibility. Returns an empty array when all connectors were requested
 * (requestedSlugs undefined), since "unknown slug" only applies to an
 * explicit request.
 */
export const findUnknownSlugs = (
  requestedSlugs: string[] | undefined,
  knownSlugs: string[]
): string[] => {
  if (!requestedSlugs) return [];
  const knownSlugsSet = new Set(knownSlugs);
  return requestedSlugs.filter((slug) => !knownSlugsSet.has(slug));
};

/** Keeps, for each connector slug, the single best compatible version found. */
export const groupConnectorVersionsBySlug = (
  connectors: Pick<ConnectorV2, 'slug' | 'version'>[]
): Map<string, string> => {
  const versionBySlug = new Map<string, string>();
  for (const connector of connectors) {
    if (connector.slug !== null && connector.version !== null) {
      versionBySlug.set(connector.slug, connector.version);
    }
  }
  return versionBySlug;
};

/**
 * Slugs explicitly requested by the caller that are known but have no
 * version compatible with the resolved OpenCTI version. Returns an empty
 * array when all connectors were requested, since incompatible connectors
 * are silently excluded rather than rejected in that case.
 */
export const findIncompatibleSlugs = (
  requestedSlugs: string[] | undefined,
  versionBySlug: Map<string, string>
): string[] => {
  if (!requestedSlugs) return [];
  return requestedSlugs.filter((slug) => !versionBySlug.has(slug));
};

export const buildMatrixEntries = (
  targetSlugs: string[],
  versionBySlug: Map<string, string>
): VersionsMatrixEntry[] =>
  targetSlugs
    .filter((slug) => versionBySlug.has(slug))
    .map((slug) => ({ slug, version: versionBySlug.get(slug) as string }));

export const buildVersionsMatrixJson = (
  productVersion: string,
  entries: VersionsMatrixEntry[]
): Record<string, string> => {
  const body: Record<string, string> = { opencti_version: productVersion };
  for (const entry of entries) {
    body[buildConnectorJsonKey(entry.slug)] = entry.version;
  }
  return body;
};

export const buildVersionsMatrixEnv = (
  productVersion: string,
  entries: VersionsMatrixEntry[]
): string => {
  const lines = [`OPENCTI_VERSION="${productVersion.toUpperCase()}"`];
  for (const entry of entries) {
    lines.push(
      `${buildConnectorEnvKey(entry.slug)}="${entry.version.toUpperCase()}"`
    );
  }
  return lines.join('\n');
};

export const buildVersionsMatrixETag = (payload: string): string =>
  `"${crypto.createHash('sha256').update(payload).digest('hex')}"`;

/** Quotes a CSV field when it contains a comma, quote, or newline. */
const escapeCsvField = (value: string): string =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

/**
 * Renders the same flat matrix as JSON/env, but as a two-row CSV: a header
 * row of field names (matching the JSON keys) and a single row of values.
 */
export const buildVersionsMatrixCsv = (
  productVersion: string,
  entries: VersionsMatrixEntry[]
): string => {
  const headerRow = [
    'opencti_version',
    ...entries.map((entry) => buildConnectorJsonKey(entry.slug)),
  ];
  const valueRow = [productVersion, ...entries.map((entry) => entry.version)];
  return [headerRow, valueRow]
    .map((row) => row.map(escapeCsvField).join(','))
    .join('\n');
};
