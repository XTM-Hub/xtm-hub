import { allow, Guard } from '../guard.types';
import { ANONYMOUS_PRINCIPAL } from '../principal';

export const publicAccess: Guard = {
  check: () => allow(),
  principalFrom: () => ANONYMOUS_PRINCIPAL,
};
