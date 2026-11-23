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

// UNAUTHENTICATED, then the first MISSING_CAPABILITY_*, then FORBIDDEN_ACCESS, then NOT_FOUND
const strongestDenial = (codes: DenialCode[]): DenialCode =>
  codes.find((code) => code === UnauthenticatedErrorCode.Unauthenticated) ??
  codes.find(isMissingCapability) ??
  codes.find((code) => code === ForbiddenErrorCode.ForbiddenAccess) ??
  NotFoundErrorCode.NotFound;

// Guards run in written order and the first that allows wins, so write the one that needs no query first.
// They must build the same principal: a system or a platform guard cannot be combined with a user guard
export const anyOf = <Args = unknown>(
  first: Guard<Args>,
  second: Guard<Args>,
  ...rest: Guard<Args>[]
): TargetedGuard<Args> => {
  const guards = [first, second, ...rest];
  if (
    guards.some(({ principalFrom }) => principalFrom !== first.principalFrom)
  ) {
    throw new Error('anyOf needs guards that build the same principal');
  }
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
        denials.push(
          result?.allowed === false
            ? result.code
            : ForbiddenErrorCode.ForbiddenAccess
        );
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
  if (
    guards.some(({ principalFrom }) => principalFrom !== first.principalFrom)
  ) {
    throw new Error('allOf needs guards that build the same principal');
  }
  return withTargets<Args>({
    principalFrom: first.principalFrom,
    check: async (principal, args) => {
      let last: GuardResult = deny(ForbiddenErrorCode.ForbiddenAccess);
      for (const guard of guards) {
        const result: GuardResult | undefined = await guard.check(
          principal,
          args
        );
        if (result?.allowed !== true) {
          return result?.allowed === false
            ? result
            : deny(ForbiddenErrorCode.ForbiddenAccess);
        }
        last = result;
      }
      return last;
    },
  });
};
