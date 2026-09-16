import {
  PortalCapability,
  ServiceRestriction,
} from '../__generated__/resolvers-types';
import { requestContext } from '../context/request.context';
import { OrganizationId } from '../model/kanel/public/Organization';
import { UserLoadUserBy } from '../model/user';
import { ForbiddenErrorCode } from '../utils/error/error.code';
import { ForbiddenAccess } from '../utils/error/error.util';
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
 * Declares the portal capabilities required to call this App-layer method,
 * enforced identically for every caller (GraphQL resolver or REST endpoint).
 * Mirrors the GraphQL `@auth(portalCapa: [...])` schema directive, which
 * stays in the schema purely for self-documentation/introspection — this
 * decorator is the single place that actually runs the check.
 */
export function RequiresPortalCapability<This, Args extends unknown[], Return>(
  capabilities: PortalCapability[]
): MethodDecorator<This, Args, Return> {
  return (target) => {
    return async function guarded(this: This, ...args: Args): Promise<Return> {
      const user = requestContext.requireUser();
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
      const user = requestContext.requireUser();
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
      const user = requestContext.requireUser();
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
      const user = requestContext.requireUser();
      if (!(await rule(user, ...args))) {
        throw ForbiddenAccess(errorCode);
      }
      return target.call(this, ...args);
    };
  };
}
