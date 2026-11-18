import {
  ForbiddenErrorCode,
  NotFoundErrorCode,
  UnauthenticatedErrorCode,
} from '../../utils/error/error.code';
import { buildPrincipal, Principal, PrincipalBuilder } from './principal';

export const DENIAL_CODES = [
  UnauthenticatedErrorCode.Unauthenticated,
  ForbiddenErrorCode.ForbiddenAccess,
  ForbiddenErrorCode.MissingCapabilityOnOrganization,
  NotFoundErrorCode.NotFound,
] as const;

export type DenialCode = (typeof DENIAL_CODES)[number];

export type GuardResult =
  { allowed: true } | { allowed: false; code: DenialCode };

export type Guard = {
  check: (principal: Principal) => GuardResult | Promise<GuardResult>;
  principalFrom: PrincipalBuilder;
};

export const allow = (): GuardResult => ({ allowed: true });

export const deny = (code: DenialCode): GuardResult => ({
  allowed: false,
  code,
});

type CallerKind = Exclude<Principal['kind'], 'anonymous'>;
export type CallerOf<Kind extends CallerKind> = Extract<
  Principal,
  { kind: Kind }
>;

const isCaller = <Kind extends CallerKind>(
  principal: Principal,
  kind: Kind
): principal is CallerOf<Kind> => principal.kind === kind;

export const forCaller = <Kind extends CallerKind>(
  kind: Kind,
  check: (caller: CallerOf<Kind>) => GuardResult,
  principalFrom: PrincipalBuilder = buildPrincipal
): Guard => ({
  check: (principal) => {
    if (principal.kind === 'anonymous') {
      return deny(UnauthenticatedErrorCode.Unauthenticated);
    }
    return isCaller(principal, kind)
      ? check(principal)
      : deny(ForbiddenErrorCode.ForbiddenAccess);
  },
  principalFrom,
});
