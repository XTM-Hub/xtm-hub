import { isDocumentPublished } from '@/utils/documents';

/**
 * Splits documents into the published ones and the others (draft, in validation),
 * keeping their order.
 */
export const splitPublishedAndOthers = <TDocument extends { status: string }>(
  documents: readonly TDocument[]
): [TDocument[], TDocument[]] =>
  documents.reduce<[TDocument[], TDocument[]]>(
    (acc, document) => {
      acc[isDocumentPublished(document.status) ? 0 : 1].push(document);
      return acc;
    },
    [[], []]
  );
