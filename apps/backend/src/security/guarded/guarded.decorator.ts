import { requestContext } from '../../context/request.context';
import { logApp } from '../../utils/app-logger.util';
import {
  ForbiddenErrorCode,
  UnauthenticatedErrorCode,
} from '../../utils/error/error.code';
import { mapToGraphQLError } from '../../utils/error/error.mapping';
import { buildScopedSystemUser } from '../system-token';
import { DenialCode, Guard, GuardResult } from './guard.types';
import { publicAccess } from './guards/public-access.guard';
import {
  ANONYMOUS_PRINCIPAL,
  buildPrincipal,
  buildSystemPrincipal,
  GuardedContext,
  Principal,
} from './principal';

type GuardableResolver = (
  parent: never,
  args: never,
  context: never,
  info: never
) => unknown;

const runGuard = async (
  guard: Guard,
  principal: Principal
): Promise<GuardResult> => {
  try {
    return await guard(principal);
  } catch (error) {
    logApp.error('Access guard threw, access denied', {
      error,
      actorId: principal.kind === 'anonymous' ? undefined : principal.actorId,
    });
    return { allowed: false, code: ForbiddenErrorCode.ForbiddenAccess };
  }
};

// Fails closed: a malformed result or an unknown code is FORBIDDEN_ACCESS, never UNKNOWN_ERROR
const toDenialCode = (result: GuardResult | undefined): DenialCode =>
  result?.allowed === false &&
  result.code === UnauthenticatedErrorCode.Unauthenticated
    ? UnauthenticatedErrorCode.Unauthenticated
    : ForbiddenErrorCode.ForbiddenAccess;

const enforce =
  (
    guard: Guard,
    resolvePrincipal: (
      context: GuardedContext
    ) => Principal | Promise<Principal>
  ) =>
  <This, Fn extends GuardableResolver>(
    _value: undefined,
    _context: ClassFieldDecoratorContext<This, Fn>
  ) =>
  (resolver: Fn): Fn => {
    const guarded = async (...args: Parameters<Fn>) => {
      // GraphQL passes the context third. GuardableResolver types it never so that any resolver fits.
      // The context goes to the resolver unchanged, except for a system caller
      const context = args[2] as GuardedContext;
      const principal = await resolvePrincipal(context);
      const result = await runGuard(guard, principal);
      // Only an explicit allow lets the resolver run, whatever else the guard returned
      if (result?.allowed !== true) {
        throw mapToGraphQLError(toDenialCode(result));
      }
      if (principal.kind === 'system') {
        const user = buildScopedSystemUser([...principal.portalCapabilities]);
        requestContext.update({ user });
        const [parent, resolverArgs, , ...rest] = args;
        return Reflect.apply(resolver, undefined, [
          parent,
          resolverArgs,
          { ...context, user },
          ...rest,
        ]);
      }
      return Reflect.apply(resolver, undefined, args);
    };
    // Same parameters as Fn, returning a Promise of its result: TypeScript cannot prove that is a generic Fn
    return guarded as unknown as Fn;
  };

export const Guarded = (guard: Guard) => {
  const { systemScopes } = guard;
  return enforce(
    guard,
    systemScopes
      ? (context) => buildSystemPrincipal(context, systemScopes)
      : buildPrincipal
  );
};

// Nothing is built and nothing is loaded: a public field makes no database call
export const Public = () =>
  enforce(publicAccess, () => Promise.resolve(ANONYMOUS_PRINCIPAL));
