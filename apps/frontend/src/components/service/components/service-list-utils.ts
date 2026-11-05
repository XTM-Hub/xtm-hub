import { isDocumentPublished } from '@/utils/documents';
import { useMemo } from 'react';
import { readInlineData } from 'react-relay';
import { GraphQLTaggedNode } from 'relay-runtime';
import { KeyType } from 'relay-runtime/lib/store/FragmentTypes';

export const splitPublishedAndOthers = <TDocument extends { status: string }>(
  documents: TDocument[]
): [TDocument[], TDocument[]] => [
  documents.filter(({ status }) => isDocumentPublished(status)),
  documents.filter(({ status }) => !isDocumentPublished(status)),
];

export function useActiveAndDraftSplit<
  TFragmentData extends { status: string },
  TFragmentKey extends KeyType<TFragmentData>,
>(
  edges: ReadonlyArray<{ readonly node: TFragmentKey }> | undefined,
  fragment: GraphQLTaggedNode
): [TFragmentData[], TFragmentData[]] {
  return useMemo(
    () =>
      splitPublishedAndOthers(
        (edges ?? []).map(
          ({ node }) =>
            readInlineData<TFragmentKey>(fragment, node) as TFragmentData
        )
      ),
    [edges, fragment]
  );
}
