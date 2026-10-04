import { validate as isUuid } from 'uuid';
import {
  DocumentMetadataKeyCode,
  DocumentMetadata as DocumentMetadataResolverType,
} from '../../../../__generated__/resolvers-types';
import { logApp } from '../../../../utils/app-logger.util';
import { BadRequestErrorCode } from '../../../../utils/error/error.code';
import { ManifestFragmentHelper } from '../../manifest-fragment/manifest-fragment.helper';
import {
  HUNT_PACK_EXTRACTED_METADATA_KEYS,
  HUNT_PACK_MAX_HUNTS,
  HUNT_PACK_MAX_PLATFORMS,
  HUNT_PACK_MAX_TECHNIQUES,
  HUNT_PACK_MINIMUM_PRODUCT_VERSION,
} from './hunt-pack.model';
import { huntImportErrors, parseNativeQueries } from './hunt-pack.validation';

/** STIX types OpenCTI exports hunts as (see hunt-pack.ts in OpenCTI). */
const HUNT_STIX_TYPES = ['hunt', 'x-opencti-hunt'];
const MITRE_SOURCE_NAMES = [
  'mitre-attack',
  'mitre-mobile-attack',
  'mitre-ics-attack',
  'mitre-pre-attack',
];
const HUNT_PLATFORM_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const ATTACK_TECHNIQUE_ID_PATTERN = /^T\d{4}(?:\.\d{3})?$/;

type StixObject = Record<string, unknown>;

export interface HuntPackSummary {
  huntCount: number;
  attackTechniques: string[];
  huntPlatforms: string[];
}

const isRecord = (value: unknown): value is StixObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A STIX 2.1 identifier: the object type, then `--` and a UUID. */
const hasStixIdentifier = (
  object: StixObject
): object is StixObject & { id: string } => {
  if (typeof object.id !== 'string' || typeof object.type !== 'string') {
    return false;
  }
  const prefix = `${object.type}--`;
  return object.id.startsWith(prefix) && isUuid(object.id.slice(prefix.length));
};

const toAttackTechniqueId = (value: unknown) => {
  const id = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return ATTACK_TECHNIQUE_ID_PATTERN.test(id) ? id : undefined;
};

const attackTechniqueId = (attackPattern: StixObject | undefined) => {
  if (attackPattern?.type !== 'attack-pattern') return undefined;
  const references = Array.isArray(attackPattern.external_references)
    ? attackPattern.external_references
    : [];
  const mitreReferenceIds = references
    .filter(
      (reference): reference is StixObject =>
        isRecord(reference) &&
        typeof reference.source_name === 'string' &&
        MITRE_SOURCE_NAMES.includes(reference.source_name)
    )
    .map((reference) => reference.external_id);
  return [attackPattern.x_mitre_id, ...mitreReferenceIds]
    .map(toAttackTechniqueId)
    .find((id) => id !== undefined);
};

const sortedUnique = (values: Iterable<string>, limit: number) =>
  Array.from(new Set(values))
    .sort((a, b) => a.localeCompare(b))
    .slice(0, limit);

const toPaddedVersion = (version: string): string | undefined => {
  try {
    return ManifestFragmentHelper.validateAndFormatManifestVersion(version);
  } catch {
    return undefined;
  }
};

export const HuntPackHelper = {
  /**
   * Validates a hunt pack with the rules of the OpenCTI import (a STIX 2.1
   * bundle with 1 to HUNT_PACK_MAX_HUNTS hunts, each accepted by the hunt
   * import checks) and summarizes its content.
   */
  summarize: (content: unknown): HuntPackSummary => {
    if (
      !isRecord(content) ||
      content.type !== 'bundle' ||
      !Array.isArray(content.objects)
    ) {
      throw new Error(BadRequestErrorCode.HuntPackInvalidBundle);
    }
    // The pack is stored and deployed as uploaded: every member must be a
    // STIX object, a null or scalar member would reach OpenCTI.
    const members: unknown[] = content.objects;
    if (!members.every(isRecord)) {
      logApp.info(
        '[HUNT_PACK] Bundle member that is not a STIX object refused'
      );
      throw new Error(BadRequestErrorCode.HuntPackInvalidBundle);
    }
    const objects = members;
    const huntObjects = objects.filter(
      (object) =>
        typeof object.type === 'string' && HUNT_STIX_TYPES.includes(object.type)
    );
    // OpenCTI identifies the hunts of a pack by their STIX identifier
    if (!huntObjects.every(hasStixIdentifier)) {
      logApp.info('[HUNT_PACK] Hunt without a valid STIX identifier refused');
      throw new Error(BadRequestErrorCode.HuntPackInvalidBundle);
    }
    if (!huntObjects.every((hunt) => hunt.spec_version === '2.1')) {
      logApp.info('[HUNT_PACK] Hunt that is not a STIX 2.1 object refused');
      throw new Error(BadRequestErrorCode.HuntPackInvalidBundle);
    }
    // A hunt listed twice is imported once by OpenCTI, as its last occurrence
    const hunts = Array.from(
      new Map(huntObjects.map((hunt) => [hunt.id, hunt])).values()
    );
    if (hunts.length === 0) {
      throw new Error(BadRequestErrorCode.HuntPackEmpty);
    }
    if (hunts.length > HUNT_PACK_MAX_HUNTS) {
      throw new Error(BadRequestErrorCode.HuntPackTooLarge);
    }
    for (const hunt of hunts) {
      const errors = huntImportErrors(hunt);
      if (errors.length > 0) {
        logApp.info('[HUNT_PACK] Hunt refused by the OpenCTI import rules', {
          hunt: hunt.id,
          errors,
        });
        throw new Error(BadRequestErrorCode.HuntPackInvalidHunt);
      }
    }

    const objectsById = new Map(
      objects
        .filter((object) => typeof object.id === 'string')
        .map((object) => [object.id as string, object])
    );
    const techniques: string[] = [];
    const platforms: string[] = [];
    for (const hunt of hunts) {
      const techniqueRefs = Array.isArray(hunt.technique_refs)
        ? hunt.technique_refs
        : [];
      for (const ref of techniqueRefs) {
        const techniqueId =
          typeof ref === 'string'
            ? attackTechniqueId(objectsById.get(ref))
            : undefined;
        if (techniqueId) techniques.push(techniqueId);
      }
      for (const nativeQuery of parseNativeQueries(hunt.native_queries)) {
        const platform =
          isRecord(nativeQuery) && typeof nativeQuery.platform === 'string'
            ? nativeQuery.platform.trim().toLowerCase()
            : '';
        if (HUNT_PLATFORM_PATTERN.test(platform)) platforms.push(platform);
      }
    }

    return {
      huntCount: hunts.length,
      attackTechniques: sortedUnique(techniques, HUNT_PACK_MAX_TECHNIQUES),
      huntPlatforms: sortedUnique(platforms, HUNT_PACK_MAX_PLATFORMS),
    };
  },

  toMetadata: (summary: HuntPackSummary): DocumentMetadataResolverType[] => [
    {
      key: DocumentMetadataKeyCode.HuntCount,
      value: String(summary.huntCount),
    },
    {
      key: DocumentMetadataKeyCode.AttackTechniques,
      value: JSON.stringify(summary.attackTechniques),
    },
    {
      key: DocumentMetadataKeyCode.HuntPlatforms,
      value: JSON.stringify(summary.huntPlatforms),
    },
  ],

  /** Drops the metadata a client may not set: it is extracted from the file. */
  withoutExtractedMetadata: (
    metadata: DocumentMetadataResolverType[]
  ): DocumentMetadataResolverType[] =>
    metadata.filter(
      ({ key }) =>
        !HUNT_PACK_EXTRACTED_METADATA_KEYS.includes(
          key as DocumentMetadataKeyCode
        )
    ),

  /**
   * A hunt pack can only be imported by an OpenCTI version that provides
   * hunts: a lower or unreadable declared version is raised to that floor.
   */
  withMinimumProductVersion: (
    metadata: DocumentMetadataResolverType[]
  ): DocumentMetadataResolverType[] => {
    const floorPadded = toPaddedVersion(HUNT_PACK_MINIMUM_PRODUCT_VERSION);
    const declared = metadata.find(
      ({ key }) => key === DocumentMetadataKeyCode.ProductVersion
    );
    const declaredPadded = declared?.value
      ? toPaddedVersion(declared.value)
      : undefined;
    if (
      declared &&
      declaredPadded &&
      floorPadded &&
      declaredPadded >= floorPadded
    ) {
      return metadata;
    }
    return [
      ...metadata.filter(
        ({ key }) => key !== DocumentMetadataKeyCode.ProductVersion
      ),
      {
        key: DocumentMetadataKeyCode.ProductVersion,
        value: HUNT_PACK_MINIMUM_PRODUCT_VERSION,
      },
    ];
  },

  parseStringList: (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }
    if (typeof value !== 'string' || !value) return [];
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : [];
    } catch {
      return [];
    }
  },
};
