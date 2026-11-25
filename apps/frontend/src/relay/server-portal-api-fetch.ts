import { UnauthenticatedError } from '@/lib/graphql-fetch.utils';
import { getGraphqlApi, networkFetch } from '@/relay/environment/fetch-fn';
import { buildSignupRedirect } from '@/utils/redirect';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { GraphQLResponse, OperationType, VariablesOf } from 'relay-runtime';
import { ConcreteRequest } from 'relay-runtime/lib/util/RelayConcreteNode';

// Call into raw network fetch to get serializable GraphQL query response
// This response will be sent to the client to "warm" the QueryResponseCache
// to avoid the client fetches.
export default async function serverPortalApiFetch<
  TRequest extends ConcreteRequest,
  TQuery extends OperationType,
>(
  request: TRequest,
  variables: VariablesOf<TQuery> = {},
  options: RequestInit = {}
): Promise<GraphQLResponse> {
  const c = await cookies();
  const h = await headers();
  const cookieList = c.getAll();
  const pathname = h.get('x-pathname');
  const apiUri = getGraphqlApi(true, 'api');
  return networkFetch({
    apiUri,
    request: request.params,
    variables,
    cookieList,
    cache: 'force-cache', //force cache on server-side, can be override by adding options
    options,
  }).catch(async (e: unknown) => {
    if (e instanceof UnauthenticatedError) {
      redirect(buildSignupRedirect(pathname));
    }
    throw e;
  });
}

export async function serverFetchGraphQL<TQuery extends OperationType>(
  request: ConcreteRequest,
  variables: VariablesOf<TQuery> = {},
  options: RequestInit = {}
): Promise<{ data: TQuery['response'] }> {
  const rawResponse = await serverPortalApiFetch<typeof request, TQuery>(
    request,
    variables,
    options
  );
  const response =
    Array.isArray(rawResponse) && rawResponse.length > 0
      ? rawResponse[0]
      : rawResponse;
  return response as unknown as { data: TQuery['response'] };
}
