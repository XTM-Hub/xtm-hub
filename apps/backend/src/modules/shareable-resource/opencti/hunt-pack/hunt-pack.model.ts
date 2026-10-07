import { DocumentMetadataKeyCode } from '../../../../__generated__/resolvers-types';
import Document from '../../../../model/kanel/public/Document';
import { MetadataArray } from '../../../../utils/metadata';

export const OPENCTI_HUNT_PACK_DOCUMENT_TYPE = 'opencti_hunt_pack';

/** First OpenCTI version able to import hunt packs. */
export const HUNT_PACK_MINIMUM_PRODUCT_VERSION = '7.261003.0';

/** Same limits as the OpenCTI hunt pack import. */
export const HUNT_PACK_MAX_HUNTS = 200;
export const HUNT_PACK_MAX_BYTES = 20 * 1024 * 1024;
export const HUNT_PACK_MAX_TECHNIQUES = 500;
export const HUNT_PACK_MAX_PLATFORMS = 50;

export type OpenCTIHuntPack = Document & {
  product_version: string;
  hunt_count: string;
  attack_techniques: string;
  hunt_platforms: string;
};

export type OpenCTIHuntPackMetadataKeys = MetadataArray<
  keyof Omit<OpenCTIHuntPack, keyof Document>
>;

export const OPENCTI_HUNT_PACK_METADATA: OpenCTIHuntPackMetadataKeys = [
  { key: DocumentMetadataKeyCode.ProductVersion },
  { key: DocumentMetadataKeyCode.HuntCount },
  { key: DocumentMetadataKeyCode.AttackTechniques },
  { key: DocumentMetadataKeyCode.HuntPlatforms },
];

export const OPENCTI_HUNT_PACK_METADATA_KEYS = OPENCTI_HUNT_PACK_METADATA.map(
  ({ key }) => key
) as DocumentMetadataKeyCode[];

/** Metadata extracted from the hunt pack file, never taken from the upload form. */
export const HUNT_PACK_EXTRACTED_METADATA_KEYS: DocumentMetadataKeyCode[] = [
  DocumentMetadataKeyCode.HuntCount,
  DocumentMetadataKeyCode.AttackTechniques,
  DocumentMetadataKeyCode.HuntPlatforms,
];
