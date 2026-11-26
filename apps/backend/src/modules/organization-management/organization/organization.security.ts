import { PortalCapability } from '../../../__generated__/resolvers-types';
import { UserLoadUserBy } from '../../../model/user';
import { AuthHelper } from '../../security-management/capability/auth.helper';

export const isUserRestrictedToOwnOrganizationMembers = (
  user: UserLoadUserBy
): boolean =>
  !AuthHelper.userHasPortalCapability(user, [
    PortalCapability.ReadOrganizationMembers,
  ]);
