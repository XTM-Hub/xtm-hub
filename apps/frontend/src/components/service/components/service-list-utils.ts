/**
 * Splits documents into the active ones and the drafts, keeping their order.
 */
export const splitActiveAndDraft = <TDocument extends { active: boolean }>(
  documents: readonly TDocument[]
): [TDocument[], TDocument[]] =>
  documents.reduce<[TDocument[], TDocument[]]>(
    (acc, document) => {
      acc[document.active ? 0 : 1].push(document);
      return acc;
    },
    [[], []]
  );
