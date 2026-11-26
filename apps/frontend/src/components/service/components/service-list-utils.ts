import { isDocumentPublished } from '@/utils/documents';
import { DocumentStatus } from '@graphql/generated';

export interface DocumentsByStatus<TDocument> {
  draft: TDocument[];
  inValidation: TDocument[];
  published: TDocument[];
}

/**
 * Splits documents by status, keeping their order. A status other than
 * published or in validation counts as draft.
 */
export const splitDocumentsByStatus = <TDocument extends { status: string }>(
  documents: readonly TDocument[]
): DocumentsByStatus<TDocument> => {
  const result: DocumentsByStatus<TDocument> = {
    draft: [],
    inValidation: [],
    published: [],
  };

  for (const document of documents) {
    if (isDocumentPublished(document.status)) {
      result.published.push(document);
    } else if (document.status === DocumentStatus.InValidation) {
      result.inValidation.push(document);
    } else {
      result.draft.push(document);
    }
  }

  return result;
};
