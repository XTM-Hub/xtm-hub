'use server';

import { getAuthenticatedGraphqlClient } from '@/lib/graphql-client';
import {
  IncrementShareNumberDocumentDocument,
  IncrementShareNumberDocumentMutation,
  IncrementShareNumberDocumentMutationVariables,
} from '@graphql/generated';

export async function updateShareNumber({
  variables,
}: {
  variables: IncrementShareNumberDocumentMutationVariables;
}) {
  const client = await getAuthenticatedGraphqlClient();
  await client.request<
    IncrementShareNumberDocumentMutation,
    IncrementShareNumberDocumentMutationVariables
  >(IncrementShareNumberDocumentDocument, variables);
}
