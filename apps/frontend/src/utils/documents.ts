import { PublicDocumentData } from '@/utils/shareable-resources/shareable-resources.types';
import type { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { DocumentImageType, DocumentItemFragment } from '@graphql/generated';

export interface ExistingFile {
  file_name: string;
  id: string;
}

export type NewFile = File & {
  preview: string;
  id: string;
};

export const docIsExistingFile = (value: unknown): value is ExistingFile => {
  return typeof value === 'object' && value !== null && 'file_name' in value;
};

export const fileListCheck = (file: unknown) =>
  file && (file as FileList).length > 0;

export const optionalFileListCheck = (file: unknown) =>
  !file || (file as FileList).length === 0 || (file as FileList).length > 0;

export const isFile = (file: unknown): file is File => file instanceof File;

// `.json` lets through a JSON file the browser reports with an empty MIME type
export const JSON_FILE_ACCEPT = 'application/json, .json';

export type FormImagesValues = Array<File | ExistingFile>;
export const splitExistingAndNewImages = (
  images: FormImagesValues
): [string[], File[]] =>
  images.reduce(
    ([existing, newImages], image) => {
      if (isFile(image)) {
        // Don't pass the big base64 encoded image to the server
        delete (image as File & { preview?: string }).preview;
        return [existing, newImages.concat(image)];
      } else {
        return [existing.concat(image.id), newImages];
      }
    },
    [[] as string[], [] as File[]]
  );

export const transformToFileList = (
  filteredImageType: DocumentImageType,
  document?: DocumentItemFragment
): FileList => {
  return (document?.children_documents ?? []).filter(
    (doc) => doc.image_type === filteredImageType
  ) as unknown as FileList;
};

export const filterDocumentImages = (
  document?: DocumentItemFragment | PublicDocumentData
) => {
  return (document?.children_documents ?? []).filter(
    (doc) => doc.image_type === DocumentImageType.Image
  );
};

export const findDocumentLogo = (
  document?: DocumentItemFragment | PublicDocumentData
) => {
  return (document?.children_documents ?? []).find(
    (doc) => doc.image_type === DocumentImageType.Logo
  );
};

/**
 * TEMPORARY Relay boundary, removed with the runtime phase of #3523.
 *
 * The documents UI is typed on the codegen `DocumentItemFragment`, while the
 * Slug pages and `ShareableResourceServiceList` still read their data through
 * Relay's `documentItem_fragment`. Both select exactly the same fields, so the
 * runtime shape is identical; only the generated types differ (Relay emits one
 * flat type with optional subtype fields and string-literal enums, codegen
 * emits a union discriminated on `__typename`). This is the single place where
 * Relay data crosses into the codegen type: do not add another.
 */
export function toDocumentItem(
  data: documentItem_fragment$data
): DocumentItemFragment;
export function toDocumentItem(
  data: documentItem_fragment$data | null | undefined
): DocumentItemFragment | undefined;
export function toDocumentItem(
  data: documentItem_fragment$data | null | undefined
): DocumentItemFragment | undefined {
  return data as unknown as DocumentItemFragment | undefined;
}
