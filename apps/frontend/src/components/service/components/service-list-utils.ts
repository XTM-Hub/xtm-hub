import { isDocumentPublished } from '@/utils/documents';

export const splitPublishedAndOthers = <TDocument extends { status: string }>(
  documents: readonly TDocument[]
): [TDocument[], TDocument[]] => [
  documents.filter(({ status }) => isDocumentPublished(status)),
  documents.filter(({ status }) => !isDocumentPublished(status)),
];
