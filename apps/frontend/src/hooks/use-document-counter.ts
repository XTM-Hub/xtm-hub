import { useState } from 'react';

interface AcknowledgedCount {
  documentId: string;
  count: number;
}

const getAcknowledgedCount = (
  acknowledged: AcknowledgedCount | null,
  documentId: string
) =>
  acknowledged && acknowledged.documentId === documentId
    ? acknowledged.count
    : 0;

/**
 * Keeps a document counter (shares, downloads) in sync with its refreshed data
 * while showing the increments this page acknowledged. Such a counter only
 * grows, so the higher of the two values wins: a refresh that already includes
 * a local increment does not count it twice, and a refresh that predates it
 * does not hide it.
 */
export const useDocumentCounter = (
  documentId: string,
  documentCount: number | null | undefined
) => {
  const [acknowledged, setAcknowledged] = useState<AcknowledgedCount | null>(
    null
  );

  const count = Math.max(
    documentCount ?? 0,
    getAcknowledgedCount(acknowledged, documentId)
  );

  const increment = () =>
    setAcknowledged((previous) => ({
      documentId,
      count:
        Math.max(
          documentCount ?? 0,
          getAcknowledgedCount(previous, documentId)
        ) + 1,
    }));

  return { count, increment };
};
