'use server';

import { getAuthenticatedGraphqlClient } from '@/lib/graphql-client';
import { redirectToSignupOnUnauthenticated } from '@/lib/server-unauthenticated-redirect';
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
  await redirectToSignupOnUnauthenticated(async () => {
    const client = await getAuthenticatedGraphqlClient();
    return client.request<
      IncrementShareNumberDocumentMutation,
      IncrementShareNumberDocumentMutationVariables
    >(IncrementShareNumberDocumentDocument, variables);
  });
}
