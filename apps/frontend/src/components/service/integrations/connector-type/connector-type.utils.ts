import type { IconName } from '@filigran/design-system';

/** OpenCTI connector types, in the order the catalog lists them. */
export const CONNECTOR_TYPES = [
  'EXTERNAL_IMPORT',
  'INTERNAL_ENRICHMENT',
  'INTERNAL_IMPORT_FILE',
  'INTERNAL_EXPORT_FILE',
  'INTERNAL_ANALYSIS',
  'INTERNAL_HUNT',
  'STREAM',
] as const;

export type ConnectorType = (typeof CONNECTOR_TYPES)[number];

/** Same glyphs as the OpenCTI catalog, through the design system icon vocabulary. */
export const CONNECTOR_TYPE_ICONS: Record<ConnectorType, IconName> = {
  EXTERNAL_IMPORT: 'cloud-download',
  INTERNAL_ENRICHMENT: 'circle-plus',
  INTERNAL_IMPORT_FILE: 'file-up',
  INTERNAL_EXPORT_FILE: 'download',
  INTERNAL_ANALYSIS: 'file-search',
  INTERNAL_HUNT: 'locate-fixed',
  STREAM: 'activity',
};

/** Catalog data may carry a connector type newer than this build. */
export const UNKNOWN_CONNECTOR_TYPE_ICON: IconName = 'box';

/** Platforms an `INTERNAL_HUNT` connector can hunt on (its `CONNECTOR_SCOPE`). */
export const HUNT_PLATFORMS = [
  'splunk',
  'microsoft-sentinel',
  'elastic-security',
  'crowdstrike-logscale',
  'google-secops',
  'opensearch',
  'clickhouse',
  's3-ocsf',
  'internet',
] as const;

export type HuntPlatform = (typeof HUNT_PLATFORMS)[number];

export const isConnectorType = (
  value: string | null | undefined
): value is ConnectorType =>
  !!value && (CONNECTOR_TYPES as readonly string[]).includes(value);

export const isHuntPlatform = (
  value: string | null | undefined
): value is HuntPlatform =>
  !!value && (HUNT_PLATFORMS as readonly string[]).includes(value);

export const getConnectorTypeIcon = (connectorType: string): IconName =>
  isConnectorType(connectorType)
    ? CONNECTOR_TYPE_ICONS[connectorType]
    : UNKNOWN_CONNECTOR_TYPE_ICON;

/** Readable label for an identifier unknown to this build: `INTERNAL_INGESTION` -> `Internal ingestion`. */
export const humanizeIdentifier = (value: string): string => {
  const words = value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};
