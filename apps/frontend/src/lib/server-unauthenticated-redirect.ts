import { UnauthenticatedError } from '@/lib/graphql-fetch.utils';
import { buildSignupRedirect } from '@/utils/redirect';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Opt-in counterpart of `serverPortalApiFetch`'s behaviour for the react-query
 * server fetches (`serverGraphqlFetch`, `getAuthenticatedGraphqlClient`), which
 * only throw `UnauthenticatedError`: wrap the call to send the visitor to the
 * signup page, then back to the page they asked for, instead.
 *
 *   await redirectToSignupOnUnauthenticated(() =>
 *     serverGraphqlFetch<MyQuery>(MyDocument)
 *   );
 *
 * Any other error is rethrown untouched.
 */
export async function redirectToSignupOnUnauthenticated<TData>(
  fetchData: () => Promise<TData>
): Promise<TData> {
  try {
    return await fetchData();
  } catch (error: unknown) {
    if (error instanceof UnauthenticatedError) {
      const pathname = (await headers()).get('x-pathname');
      redirect(buildSignupRedirect(pathname));
    }
    throw error;
  }
}
