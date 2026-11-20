import { requestContext } from '../../context/request.context';
import { UserLoadUserBy } from '../../model/user';
import { logApp } from '../../utils/app-logger.util';
import { ForbiddenErrorCode } from '../../utils/error/error.code';
import { mapToGraphQLError } from '../../utils/error/error.mapping';
import { buildPlatformUser, buildScopedSystemUser } from '../machine-user';
import { DENIAL_CODES, DenialCode, Guard, GuardResult } from './guard.types';
import { publicAccess } from './guards/public-access.guard';
import { GuardedContext, PlatformPrincipal, Principal } from './principal';

type GuardableResolver = (
  parent: never,
  args: never,
  context: never,
  info: never
) => unknown;

type MachineContext = {
  user: UserLoadUserBy;
  platformCaller?: PlatformPrincipal;
};

const machineContext = (principal: Principal): MachineContext | undefined => {
  switch (principal.kind) {
    case 'system':
      return {
        user: buildScopedSystemUser([...principal.portalCapabilities]),
      };
    case 'platform':
      return {
        user: buildPlatformUser(principal.organization),
        platformCaller: principal,
      };
    default:
      return undefined;
  }
};

const runGuard = async (
  guard: Guard,
  principal: Principal,
  args: unknown
): Promise<GuardResult> => {
  try {
    return await guard.check(principal, args);
  } catch (error) {
    logApp.error('Access guard threw, access denied', {
      error,
      actorId: principal.kind === 'anonymous' ? undefined : principal.actorId,
    });
    return { allowed: false, code: ForbiddenErrorCode.ForbiddenAccess };
  }
};

const isDenialCode = (code: unknown): code is DenialCode =>
  DENIAL_CODES.some((denialCode) => denialCode === code);

// Fails closed: a malformed result or an unknown code is FORBIDDEN_ACCESS, never UNKNOWN_ERROR
const toDenialCode = (result: GuardResult | undefined): DenialCode =>
  result?.allowed === false && isDenialCode(result.code)
    ? result.code
    : ForbiddenErrorCode.ForbiddenAccess;

const enforce =
  (guard: Guard) =>
  <This, Fn extends GuardableResolver>(
    _value: undefined,
    _context: ClassFieldDecoratorContext<This, Fn>
  ) =>
  (resolver: Fn): Fn => {
    const guarded = async (...args: Parameters<Fn>) => {
      // GraphQL passes the context third. GuardableResolver types it never so that any resolver fits.
      // The context goes to the resolver unchanged, except for a system or a platform caller
      const context = args[2] as GuardedContext;
      const principal = await guard.principalFrom(context);
      const result = await runGuard(guard, principal, args[1]);
      // Only an explicit allow lets the resolver run, whatever else the guard returned
      if (result?.allowed !== true) {
        throw mapToGraphQLError(toDenialCode(result));
      }
      const machine = machineContext(principal);
      if (!machine) {
        return Reflect.apply(resolver, undefined, args);
      }
      requestContext.update({ user: machine.user });
      const [parent, resolverArgs, , ...rest] = args;
      return Reflect.apply(resolver, undefined, [
        parent,
        resolverArgs,
        { ...context, ...machine },
        ...rest,
      ]);
    };
    // Same parameters as Fn, returning a Promise of its result: TypeScript cannot prove that is a generic Fn
    return guarded as unknown as Fn;
  };

export const Guarded = (guard: Guard) => enforce(guard);

// Nothing is built and nothing is loaded: a public field makes no database call
export const Public = () => enforce(publicAccess);
