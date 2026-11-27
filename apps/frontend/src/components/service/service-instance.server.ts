import { getAuthenticatedGraphqlClient } from '@/lib/graphql-client';
import { NOT_FOUND_ERROR_CODE } from '@/lib/graphql-fetch.utils';
import { redirectToSignupOnUnauthenticated } from '@/lib/server-unauthenticated-redirect';
import {
  type ServiceInstanceItemFragment,
  useServiceInstanceByIdQuery,
} from '@graphql/generated';

// The API answers a service instance that does not exist or that the visitor
// cannot see with one of these errors rather than with `null`. They are copied
// from apps/backend/src, since the frontend image is built from apps/frontend
// alone: renaming one there must be mirrored here, or the page shows the error
// page instead of its not found state.
// - NOT_FOUND: the denial code of the access guards for a hidden or missing instance
// - SERVICE_INSTANCE_NOT_FOUND: ErrorCode.ServiceInstanceNotFound, the app check (a platform admin)
// - SERVICE_INSTANCE_NOT_PUBLIC: ErrorCode.ServiceInstanceNotPublic, the app check (a platform admin),
//   deliberately treated as not found: a hidden service gets the same state as a missing one
const SERVICE_INSTANCE_LOOKUP_ERRORS = new Set([
  'SERVICE_INSTANCE_NOT_FOUND',
  'SERVICE_INSTANCE_NOT_PUBLIC',
  NOT_FOUND_ERROR_CODE,
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
