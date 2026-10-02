import {
  DocumentImageType,
  DocumentMetadataKeyCode,
} from '../../__generated__/resolvers-types';
import Document from '../../model/kanel/public/Document';
import { MetadataArray } from '../../utils/metadata';

export type DocumentListOptions = {
  activeOnly?: boolean;
};

export type DocumentImage = Document & {
  image_type: DocumentImageType;
};

export type DocumentImageMetadata = MetadataArray<
  keyof Omit<DocumentImage, keyof Document>
>;

export const DOCUMENT_IMAGE_METADATA: DocumentImageMetadata = [
  { key: DocumentMetadataKeyCode.ImageType },
];

export const DOCUMENT_IMAGE_METADATA_KEYS: DocumentMetadataKeyCode[] =
  DOCUMENT_IMAGE_METADATA.map(({ key }) => key) as DocumentMetadataKeyCode[];
