import { DocumentMetadataKeyCode } from '../../../../__generated__/resolvers-types';
import { BadRequestErrorCode } from '../../../../utils/error/error.code';
import { ManifestFragmentHelper } from '../../manifest-fragment/manifest-fragment.helper';

/** Values of the OpenCTI `ConnectorType` enumeration, carried as `image_type` by manifest fragments. */
export const OPENCTI_CONNECTOR_TYPES = [
  'EXTERNAL_IMPORT',
  'INTERNAL_ANALYSIS',
  'INTERNAL_ENRICHMENT',
  'INTERNAL_EXPORT_FILE',
  'INTERNAL_HUNT',
  'INTERNAL_IMPORT_FILE',
  'STREAM',
] as const;

export type OpenCtiConnectorType = (typeof OPENCTI_CONNECTOR_TYPES)[number];

export const INTERNAL_HUNT_CONNECTOR_TYPE: OpenCtiConnectorType =
  'INTERNAL_HUNT';

/**
 * First OpenCTI version able to register a connector type added after the
 * other ones: older platforms reject the registration of such a connector.
 */
export const MINIMUM_PLATFORM_VERSION_BY_CONNECTOR_TYPE: Readonly<
  Partial<Record<OpenCtiConnectorType, string>>
> = {
  // 7.261002 is the last OpenCTI release without hunts.
  INTERNAL_HUNT: '7.261003.0',
};

/**
 * Connector metadata written by catalog ingestion (manifest fragments and the
 * legacy manifest) that the connector form never submits.
 */
export const INGESTION_OWNED_CONNECTOR_METADATA_KEYS: readonly DocumentMetadataKeyCode[] =
  [
    DocumentMetadataKeyCode.ImageType,
    DocumentMetadataKeyCode.ImageName,
    DocumentMetadataKeyCode.ConfigSchema,
    DocumentMetadataKeyCode.AdditionalProperties,
    DocumentMetadataKeyCode.ManifestFragmentId,
    DocumentMetadataKeyCode.VersionPadded,
    DocumentMetadataKeyCode.LastVerifiedDate,
    DocumentMetadataKeyCode.MinimumDeployableVersionPadded,
  ];

type MetadataEntry = { key: DocumentMetadataKeyCode; value: string };

const HUNT_PLATFORM_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

const isOpenCtiConnectorType = (value: string): value is OpenCtiConnectorType =>
  (OPENCTI_CONNECTOR_TYPES as readonly string[]).includes(value);

const toPaddedVersion = (version: string): string | undefined => {
  try {
    return ManifestFragmentHelper.validateAndFormatManifestVersion(version);
  } catch {
    return undefined;
  }
};

const parseJsonObject = (
  value: string | Record<string, unknown> | null | undefined
): Record<string, unknown> | undefined => {
  if (!value) return undefined;
  if (typeof value !== 'string') return value;
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
};

export const ConnectorTypeHelper = {
  /** Canonical connector type for a raw value (`internal-hunt`, ` INTERNAL_HUNT `), or undefined when unknown. */
  normalize: (
    value: string | null | undefined
  ): OpenCtiConnectorType | undefined => {
    if (!value) return undefined;
    const candidate = value.trim().toUpperCase().replace(/-/g, '_');
    return isOpenCtiConnectorType(candidate) ? candidate : undefined;
  },

  parse: (value: string): OpenCtiConnectorType => {
    const connectorType = ConnectorTypeHelper.normalize(value);
    if (!connectorType) {
      throw new Error(BadRequestErrorCode.ConnectorTypeNotRecognized);
    }
    return connectorType;
  },

  /**
   * The minimum OpenCTI version a connector can be deployed on: the higher of
   * the declared minimum and the first version that knows its connector type.
   * A declared minimum that cannot be compared is replaced by the type floor.
   */
  resolveMinimumDeployableVersion: (
    connectorType: OpenCtiConnectorType | null | undefined,
    declaredMinimumVersion: string | null | undefined
  ): string | undefined => {
    const floor = connectorType
      ? MINIMUM_PLATFORM_VERSION_BY_CONNECTOR_TYPE[connectorType]
      : undefined;
    const declared = declaredMinimumVersion?.trim() || undefined;
    if (!floor) return declared;
    if (!declared) return floor;

    const declaredPadded = toPaddedVersion(declared);
    const floorPadded = toPaddedVersion(floor);
    if (!declaredPadded || !floorPadded) return floor;
    return declaredPadded >= floorPadded ? declared : floor;
  },

  /**
   * Metadata to store for an edited connector: the submitted entries plus the
   * stored ingestion-owned entries the edit does not carry. The minimum
   * deployable version keeps the floor of the connector type, and its padded
   * form follows it, so an edit never offers a connector to a platform that
   * cannot register it.
   */
  mergeEditedMetadata: (
    submitted: MetadataEntry[],
    stored: MetadataEntry[]
  ): MetadataEntry[] => {
    const submittedKeys = new Set(submitted.map(({ key }) => key));
    const merged: MetadataEntry[] = [
      ...submitted,
      ...stored.filter(
        ({ key }) =>
          INGESTION_OWNED_CONNECTOR_METADATA_KEYS.includes(key) &&
          !submittedKeys.has(key)
      ),
    ];
    const valueOf = (key: DocumentMetadataKeyCode) =>
      merged.find((entry) => entry.key === key)?.value;

    const connectorType = ConnectorTypeHelper.normalize(
      valueOf(DocumentMetadataKeyCode.ImageType)
    );
    const hasFloor = Boolean(
      connectorType && MINIMUM_PLATFORM_VERSION_BY_CONNECTOR_TYPE[connectorType]
    );
    const hasPadded =
      valueOf(DocumentMetadataKeyCode.MinimumDeployableVersionPadded) !==
      undefined;
    if (!hasFloor && !hasPadded) {
      return merged;
    }

    const minimum = ConnectorTypeHelper.resolveMinimumDeployableVersion(
      connectorType,
      valueOf(DocumentMetadataKeyCode.MinimumDeployableVersion)
    );
    const minimumPadded = minimum ? toPaddedVersion(minimum) : undefined;
    const result = merged.filter(
      ({ key }) =>
        key !== DocumentMetadataKeyCode.MinimumDeployableVersion &&
        key !== DocumentMetadataKeyCode.MinimumDeployableVersionPadded
    );
    if (minimum) {
      result.push({
        key: DocumentMetadataKeyCode.MinimumDeployableVersion,
        value: minimum,
      });
    }
    if (hasPadded && minimumPadded) {
      result.push({
        key: DocumentMetadataKeyCode.MinimumDeployableVersionPadded,
        value: minimumPadded,
      });
    }
    return result;
  },

  /** The platform an `INTERNAL_HUNT` connector hunts on: the `CONNECTOR_SCOPE` default of its config schema. */
  resolveHuntPlatform: (connector: {
    image_type?: string | null;
    config_schema?: string | Record<string, unknown> | null;
  }): string | null => {
    if (
      ConnectorTypeHelper.normalize(connector.image_type) !==
      INTERNAL_HUNT_CONNECTOR_TYPE
    ) {
      return null;
    }
    const properties = parseJsonObject(connector.config_schema)?.properties;
    if (typeof properties !== 'object' || properties === null) return null;
    const scope = (properties as Record<string, { default?: unknown }>)
      .CONNECTOR_SCOPE?.default;
    const value = Array.isArray(scope) && scope.length === 1 ? scope[0] : scope;
    if (typeof value !== 'string') return null;
    const platform = value.trim().toLowerCase();
    return HUNT_PLATFORM_PATTERN.test(platform) ? platform : null;
  },
};
