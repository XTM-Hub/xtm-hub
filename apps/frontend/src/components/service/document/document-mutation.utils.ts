import type { ServiceFormValues } from '@/components/service/components/subscribable-services.types';
import type { GraphqlUploads } from '@/lib/graphql-upload-client';
import { omit } from '@/lib/omit';
import { pick } from '@/lib/pick';
import type {
  CreateDocumentInput,
  DocumentMetadata,
  DocumentMetadataKeyCode,
  LicenseType,
  UpdateDocumentInput,
} from '@graphql/generated';

export type DocumentFormValues = ServiceFormValues & {
  entity_types?: string[] | null;
  license_type?: LicenseType | null;
  solution_categories?: string[] | null;
};

const documentBaseKeys: Array<keyof DocumentFormValues> = [
  'name',
  'slug',
  'uploader_id',
  'uploader_organization_id',
  'short_description',
  'description',
  'use_cases',
  'solution_categories',
  'license_type',
  'entity_types',
  'active',
];

const documentFileKeys: Array<keyof DocumentFormValues> = [
  'document',
  'logo',
  'images',
];

export const toCreateDocumentInput = (
  values: DocumentFormValues
): CreateDocumentInput => {
  const input = omit(
    {
      ...pick(values, documentBaseKeys),
      uploader_id: values.uploader_id ?? '',
    },
    ['uploader_organization_id']
  );

  return {
    ...input,
    active: input.active ?? false,
    use_cases: input.use_cases ?? [],
    solution_categories: input.solution_categories ?? [],
    entity_types: input.entity_types ?? null,
    license_type: input.license_type ?? null,
  };
};

/**
 * The API reads an omitted field as "leave it untouched" and `null` as "clear
 * it" (`use_cases`, for instance), so a field the form does not carry has to
 * stay omitted. Codegen types every optional field as required, hence the
 * cast: it is the only way to keep those fields out of the request.
 */
export const toUpdateDocumentInput = (
  values: DocumentFormValues
): UpdateDocumentInput =>
  omit(
    {
      ...pick(values, documentBaseKeys),
      uploader_id: values.uploader_id ?? '',
    },
    ['slug']
  ) as UpdateDocumentInput;

/** Every form value that is neither a document column nor a file is metadata. */
export const toDocumentMetadata = (
  values: DocumentFormValues
): DocumentMetadata[] => {
  const metadata = omit(values, [...documentBaseKeys, ...documentFileKeys]);
  return Object.keys(metadata)
    .map((key) => ({
      key: key as DocumentMetadataKeyCode,
      value: metadata[key as keyof typeof metadata],
    }))
    .filter(({ value }) => Boolean(value));
};

interface DocumentFiles {
  sourceDocument?: File;
  logo?: File;
  images: File[];
}

/**
 * The files of a document mutation, keyed by the variable each one fills: the
 * source document and the logo are single `Upload` variables, the images an
 * `[Upload!]` list. A variable with nothing to send is left out, so a mutation
 * without any file stays a plain JSON request.
 */
export const toDocumentUploads = ({
  sourceDocument,
  logo,
  images,
}: DocumentFiles): GraphqlUploads => ({
  ...(sourceDocument ? { sourceDocument } : {}),
  ...(logo ? { logo } : {}),
  ...(images.length > 0 ? { images } : {}),
});
