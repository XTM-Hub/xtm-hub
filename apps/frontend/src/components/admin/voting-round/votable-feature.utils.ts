import type { VotableFeatureFormValues } from '@/components/admin/voting-round/VotableFeatureForm';
import type { GraphqlUploads } from '@/lib/graphql-upload-client';

/**
 * Splits the form values into the parts the API expects: the plain input, and
 * the file that has to travel as a multipart upload.
 */
export const buildVotableFeatureInput = (values: VotableFeatureFormValues) => ({
  title: values.title,
  short_description: values.short_description,
  description: values.description,
  product: values.product,
  use_case_ids: values.use_case_ids,
  position: Number(values.position),
  active: values.active,
});

export const extractIllustrationFiles = (
  values: VotableFeatureFormValues
): File[] => Array.from(values.illustration_document ?? []);

export const toGraphqlUploads = (files: File[]): GraphqlUploads => ({
  document: files,
});

/**
 * Every field of the input is required, so the current document id is resent
 * untouched unless the admin asked for a removal. A newly uploaded file makes
 * the value irrelevant: the API overrides it with the document it just stored.
 */
export const resolveIllustrationDocumentId = (
  values: VotableFeatureFormValues,
  currentDocumentId: string | null | undefined
): string | null =>
  values.remove_illustration ? null : (currentDocumentId ?? null);
