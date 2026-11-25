import {
  ForbiddenErrorCode,
  NotFoundErrorCode,
  UnauthenticatedErrorCode,
} from '../../../utils/error/error.code';
import {
  DenialCode,
  deny,
  Guard,
  GuardResult,
  TargetedGuard,
  withTargets,
} from '../guard.types';

const isMissingCapability = (code: DenialCode) =>
  code === ForbiddenErrorCode.MissingCapabilityOnOrganization ||
  code === ForbiddenErrorCode.MissingCapabilityOnService;

// UNAUTHENTICATED, then NOT_ALLOWED_WITH_API_TOKEN, then the first MISSING_CAPABILITY_*, then FORBIDDEN_ACCESS, then
// NOT_FOUND
const strongestDenial = (codes: DenialCode[]): DenialCode =>
  codes.find((code) => code === UnauthenticatedErrorCode.Unauthenticated) ??
  codes.find((code) => code === ForbiddenErrorCode.NotAllowedWithApiToken) ??
  codes.find(isMissingCapability) ??
  codes.find((code) => code === ForbiddenErrorCode.ForbiddenAccess) ??
  NotFoundErrorCode.NotFound;

// A system or a platform guard cannot be combined with a user guard
const assertSamePrincipal = <Args>(guards: Guard<Args>[]): void => {
  if (
    guards.some(
      ({ principalFrom }) => principalFrom !== guards[0]?.principalFrom
    )
  ) {
    throw new Error('The guards of a combinator must build the same principal');
  }
};

// A result that is not a denial, such as a guard that returns nothing, is FORBIDDEN_ACCESS
const asDenial = (
  result: GuardResult | undefined
): Extract<GuardResult, { allowed: false }> =>
  result?.allowed === false
    ? result
    : { allowed: false, code: ForbiddenErrorCode.ForbiddenAccess };

// Guards run in written order and the first that allows wins, so write the one that needs no query first
export const anyOf = <Args = unknown>(
  first: Guard<Args>,
  second: Guard<Args>,
  ...rest: Guard<Args>[]
): TargetedGuard<Args> => {
  const guards = [first, second, ...rest];
  assertSamePrincipal(guards);
  return withTargets<Args>({
    principalFrom: first.principalFrom,
    check: async (principal, args) => {
      const denials: DenialCode[] = [];
      for (const guard of guards) {
        const result: GuardResult | undefined = await guard.check(
          principal,
          args
        );
        if (result?.allowed === true) {
          return result;
        }
        denials.push(asDenial(result).code);
      }
      return deny(strongestDenial(denials));
    },
  });
};

// Sequential on purpose: the first denial wins, and the last guard's `checked` is the one `.targets()` reads
export const allOf = <Args = unknown>(
  first: Guard<Args>,
  second: Guard<Args>,
  ...rest: Guard<Args>[]
): TargetedGuard<Args> => {
  const guards = [first, second, ...rest];
  assertSamePrincipal(guards);
  const last = rest.at(-1) ?? second;
  return withTargets<Args>({
    principalFrom: first.principalFrom,
    check: async (principal, args) => {
      for (const guard of guards.slice(0, -1)) {
        const result: GuardResult | undefined = await guard.check(
          principal,
          args
        );
        if (result?.allowed !== true) {
          return asDenial(result);
        }
      }
      const result: GuardResult | undefined = await last.check(principal, args);
      return result?.allowed === true ? result : asDenial(result);
    },
  });
};
