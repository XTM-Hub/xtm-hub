import {
  ForbiddenErrorCode,
  UnauthenticatedErrorCode,
} from '../../utils/error/error.code';
import { Principal } from './principal';

export type DenialCode =
  UnauthenticatedErrorCode.Unauthenticated | ForbiddenErrorCode.ForbiddenAccess;

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
