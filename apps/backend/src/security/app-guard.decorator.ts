import {
  PortalCapability,
  ServiceRestriction,
} from '../__generated__/resolvers-types';
import { requestContext } from '../context/request.context';
import { OrganizationId } from '../model/kanel/public/Organization';
import { UserLoadUserBy } from '../model/user';
import { ForbiddenErrorCode } from '../utils/error/error.code';
import {
  ForbiddenAccess,
  UnauthenticatedAccess,
} from '../utils/error/error.util';
import {
  hasServiceCapability,
  ServiceCapabilityArgs,
} from './directive-graphql/validator/service-capability.validator';
import { securityGuard } from './guard';

type AsyncMethod<This, Args extends unknown[], Return> = (
  this: This,
  ...args: Args
) => Promise<Return>;

type MethodDecorator<This, Args extends unknown[], Return> = (
  target: AsyncMethod<This, Args, Return>,
  context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>
) => AsyncMethod<This, Args, Return>;

/**
 * `requestContext.requireUser()` throws a bare (non-Error) sentinel for both
 * "no request context at all" and "context present but no user" — neither of
 * which maps to a CustomApolloError, so it falls through to a generic 500
 * for REST callers (and an unmapped error for GraphQL) instead of a proper
 * 401. This wrapper is what the guard decorators use instead: it always
 * throws a real `UnauthenticatedAccess` for a missing user, exactly like the
 * GraphQL `@auth` directive's own `isAuthenticated` check does.
 */
const requireAuthenticatedUser = (): UserLoadUserBy => {
  const user = requestContext.get()?.user;
  if (!user) {
    throw UnauthenticatedAccess('Not authorized: You are not authenticated');
  }
  return user;
};

/**
 * Declares the portal capabilities required to call this App-layer method,
 * enforced identically for every caller (GraphQL resolver or REST endpoint).
 * Mirrors the GraphQL `@auth`/`@system_token` schema directives, which are
 * NOT disabled by this decorator — the existing `authDirectiveTransformer`
 * still actively enforces them on any field that declares one (this is
 * unavoidable for `@system_token`, since it also populates the synthetic
 * system-token user this decorator's `requireAuthenticatedUser()` reads).
 * For a field carrying both, the two checks currently run independently and
 * can drift; treat the decorator as the source of truth for non-GraphQL
 * callers, not yet as a replacement for the schema-level check.
 */
export function RequiresPortalCapability<This, Args extends unknown[], Return>(
  capabilities: PortalCapability[]
): MethodDecorator<This, Args, Return> {
  return (target) => {
    return async function guarded(this: This, ...args: Args): Promise<Return> {
      const user = requireAuthenticatedUser();
      await securityGuard.assertUserPortalCapabilities(user, capabilities);
      return target.call(this, ...args);
    };
  };
}

/**
 * Declares that the caller must belong to the organization resolved from the
 * method's own arguments (e.g. `input.organizationId`), for methods whose
 * access scope isn't a fixed capability list but a resource ownership check.
 */
export function RequiresOrgMembership<This, Args extends unknown[], Return>(
  getOrganizationId: (...args: Args) => OrganizationId
): MethodDecorator<This, Args, Return> {
  return (target) => {
    return async function guarded(this: This, ...args: Args): Promise<Return> {
      const user = requireAuthenticatedUser();
      await securityGuard.assertUserIsInOrganization(
        user,
        getOrganizationId(...args)
      );
      return target.call(this, ...args);
    };
  };
}

/**
 * Declares the service-scoped capabilities required to call this method,
 * for access resolved by service instance/subscription rather than a portal
 * or organization capability. Mirrors the GraphQL `@service_capa` directive.
 */
export function RequiresServiceCapability<This, Args extends unknown[], Return>(
  capabilities: ServiceRestriction[],
  getServiceArgs: (...args: Args) => ServiceCapabilityArgs
): MethodDecorator<This, Args, Return> {
  return (target) => {
    return async function guarded(this: This, ...args: Args): Promise<Return> {
      const user = requireAuthenticatedUser();
      const isAllowed = await hasServiceCapability(
        user,
        getServiceArgs(...args),
        capabilities
      );
      if (!isAllowed) {
        // Message must be a known ErrorCode, not free text: resolvers that
        // catch and call mapToGraphQLError() look it up by value, and an
        // unrecognized message silently downgrades this 403 into a 500.
        throw ForbiddenAccess(ForbiddenErrorCode.MissingCapabilityOnService);
      }
      return target.call(this, ...args);
    };
  };
}

/**
 * Generic escape hatch for one-off authorization rules that don't fit a
 * named shape above — the predicate receives the authenticated user plus
 * the method's own arguments, exactly like the named decorators do.
 *
 * `errorCode` is required (not a free-text message) so this rule behaves
 * like every other error in the codebase: add a dedicated entry to
 * `ForbiddenErrorCode` for the specific rule rather than passing a sentence,
 * so it maps correctly whether the caller propagates the error directly or
 * routes it through `mapToGraphQLError`.
 */
export function RequiresRule<This, Args extends unknown[], Return>(
  rule: (user: UserLoadUserBy, ...args: Args) => boolean | Promise<boolean>,
  errorCode: ForbiddenErrorCode
): MethodDecorator<This, Args, Return> {
  return (target) => {
    return async function guarded(this: This, ...args: Args): Promise<Return> {
      const user = requireAuthenticatedUser();
      if (!(await rule(user, ...args))) {
        throw ForbiddenAccess(errorCode);
      }
      return target.call(this, ...args);
    };
  };
}
