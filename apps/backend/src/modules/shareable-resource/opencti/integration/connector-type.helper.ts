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
