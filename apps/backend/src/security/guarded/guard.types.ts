import { OrganizationId } from '../../model/kanel/public/Organization';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
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
  ForbiddenErrorCode.MissingCapabilityOnService,
  NotFoundErrorCode.NotFound,
] as const;

export type DenialCode = (typeof DENIAL_CODES)[number];

// What an allowing guard checked, read only by the checks on the ids of the request (`targets`), never by the resolver
export type Checked =
  | { kind: 'admin' }
  | { kind: 'organization'; organizationId: OrganizationId }
  | {
      kind: 'serviceInstance';
      serviceInstanceId: ServiceInstanceId;
      organizationId: OrganizationId;
    };

export type GuardResult =
  { allowed: true; checked?: Checked } | { allowed: false; code: DenialCode };

// `check` uses method syntax so that a Guard<{ …args }> stays assignable to a Guard under strictFunctionTypes
export type Guard<Args = unknown> = {
  check(principal: Principal, args: Args): GuardResult | Promise<GuardResult>;
  principalFrom: PrincipalBuilder;
};

export type TargetCheck<Args = unknown> = (
  principal: Principal,
  args: Args,
  checked: Checked | undefined
) => GuardResult | Promise<GuardResult>;

export type TargetedGuard<Args = unknown> = Guard<Args> & {
  // Adds checks on the ids in the arguments, run once the guard allows
  targets(...checks: TargetCheck<Args>[]): Guard<Args>;
};

export const allow = (checked?: Checked): GuardResult =>
  checked ? { allowed: true, checked } : { allowed: true };

export const deny = (code: DenialCode): GuardResult => ({
  allowed: false,
  code,
});

export const withTargets = <Args>(guard: Guard<Args>): TargetedGuard<Args> => ({
  ...guard,
  targets: (...checks) => ({
    ...guard,
    check: async (principal, args) => {
      const result = await guard.check(principal, args);
      if (result?.allowed !== true) {
        return result;
      }
      for (const check of checks) {
        const outcome = await check(principal, args, result.checked);
        if (outcome?.allowed !== true) {
          return outcome;
        }
      }
      return result;
    },
  }),
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

export const forCaller = <Kind extends CallerKind, Args = unknown>(
  kind: Kind,
  check: (
    caller: CallerOf<Kind>,
    args: Args
  ) => GuardResult | Promise<GuardResult>,
  principalFrom: PrincipalBuilder = buildPrincipal
): TargetedGuard<Args> =>
  withTargets<Args>({
    check: (principal, args) => {
      if (principal.kind === 'anonymous') {
        return deny(UnauthenticatedErrorCode.Unauthenticated);
      }
      return isCaller(principal, kind)
        ? check(principal, args)
        : deny(ForbiddenErrorCode.ForbiddenAccess);
    },
    principalFrom,
  });
