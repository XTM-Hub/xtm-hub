import { OrganizationId } from '../../../model/kanel/public/Organization';
import User from '../../../model/kanel/public/User';

export const OrganizationHelper = {
  personalSpaceIdOf: (user: Pick<User, 'id'>) =>
    user.id as unknown as OrganizationId,
};
