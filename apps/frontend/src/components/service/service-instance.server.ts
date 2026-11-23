import { getAuthenticatedGraphqlClient } from '@/lib/graphql-client';
import { redirectToSignupOnUnauthenticated } from '@/lib/server-unauthenticated-redirect';
import {
  type ServiceInstanceItemFragment,
  useServiceInstanceByIdQuery,
} from '@graphql/generated';

// The API answers a service instance that does not exist or that the visitor
// cannot see with one of these errors rather than with `null`.
// Copied from ErrorCode.ServiceInstanceNotFound and
// ErrorCode.ServiceInstanceNotPublic in apps/backend/src/utils/error/error.code.ts:
// the frontend image is built from apps/frontend alone, so it cannot import
// them. Renaming either there must be mirrored here, or the page shows the
// error page instead of its not found state.
// SERVICE_INSTANCE_NOT_PUBLIC is deliberately treated as not found: a service
// the visitor cannot see gets the same not found state as a missing one.
const SERVICE_INSTANCE_LOOKUP_ERRORS = new Set([
  'SERVICE_INSTANCE_NOT_FOUND',
  'SERVICE_INSTANCE_NOT_PUBLIC',
]);

const isServiceInstanceLookupError = (error: unknown) =>
  error instanceof Error && SERVICE_INSTANCE_LOOKUP_ERRORS.has(error.message);

/**
 * The service instance a service page renders, read on the server with the
 * visitor's cookies: `null` when it does not exist or the visitor cannot see
 * it, so the page shows its not found state. An anonymous visitor is sent to
 * the signup page; any other failure is rethrown.
 */
export const fetchServiceInstanceById = async (
  serviceInstanceId: string
): Promise<ServiceInstanceItemFragment | null> =>
  redirectToSignupOnUnauthenticated(async () => {
    try {
      const data = await useServiceInstanceByIdQuery.fetcher(
        await getAuthenticatedGraphqlClient(),
        { service_instance_id: serviceInstanceId }
      )();
      return data.serviceInstanceById;
    } catch (error) {
      if (isServiceInstanceLookupError(error)) {
        return null;
      }
      throw error;
    }
  });
