import type { Response } from 'express';
import { mapToGraphQLError } from './error.mapping';
import { CustomApolloError, ErrorType } from './error.type';

/**
 * `data.http_status` on a CustomApolloError is a GraphQL-only convention:
 * GraphQL-over-HTTP always responds 200 regardless of resolver errors, so
 * NotFoundError/AlreadyExistsError/StillReferencedError deliberately carry
 * `http_status: 200` there — it's metadata for the client to interpret, not
 * an instruction to set the transport status. Forwarding it as-is for REST
 * would literally return "200 OK" for a 404/409 case, so those three are
 * remapped to a real REST status here; every other error type's
 * `http_status` already matches its intended REST meaning (400/401/403/500).
 */
const REST_STATUS_OVERRIDES: Partial<Record<ErrorType, number>> = {
  [ErrorType.NotFound]: 404,
  [ErrorType.AlreadyExists]: 409,
  [ErrorType.StillReference]: 409,
};

const isCustomApolloError = (error: unknown): error is CustomApolloError =>
  error instanceof Error &&
  'data' in error &&
  typeof (error as CustomApolloError).data?.http_status === 'number';

/**
 * REST counterpart to mapToGraphQLError/formatError: GraphQL gets its HTTP
 * semantics for free from Apollo Server, which reads a thrown
 * CustomApolloError's `data.http_status`. REST has no equivalent pipeline,
 * so any endpoint that calls into shared App-layer code (including the
 * `Requires*` guard decorators) needs to translate that same error itself.
 *
 * An already-built CustomApolloError (e.g. thrown directly by
 * `ForbiddenAccess(...)`) is used as-is, to both preserve its own `.name`
 * even if its message isn't a recognized error code, and avoid re-wrapping
 * it (and double-logging) through `mapToGraphQLError`. Anything else —
 * including a plain `Error(ErrorCode...)` thrown by an existing validator
 * such as `securityGuard.assertUserIsInOrganization` — is routed through
 * `mapToGraphQLError` so it still resolves to its correct status instead of
 * falling through to a generic 500, exactly as it already does for GraphQL
 * callers using the same try/catch + mapToGraphQLError pattern.
 */
export const sendAppError = (res: Response, error: unknown): void => {
  const mapped = isCustomApolloError(error) ? error : mapToGraphQLError(error);
  const status =
    REST_STATUS_OVERRIDES[mapped.name as ErrorType] ??
    mapped.data.http_status ??
    500;
  res.status(status).json({ code: status, message: mapped.message });
};
