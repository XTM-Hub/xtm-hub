import { ErrorType } from '../../utils/error/error.type';
import { Principal } from './principal';

export type DenialCode = ErrorType.Unauthenticated | ErrorType.ForbiddenAccess;

export type GuardResult =
  { allowed: true } | { allowed: false; code: DenialCode };

export type Guard = (
  principal: Principal
) => GuardResult | Promise<GuardResult>;

export const allow = (): GuardResult => ({ allowed: true });

export const deny = (code: DenialCode): GuardResult => ({
  allowed: false,
  code,
});
