import UserService, {
  UserServiceId,
} from '../../../model/kanel/public/UserService';
import { UserServiceDomain } from '../../user-service/user-service.domain';
import { UserServiceCapabilityHelper } from './user-service-capability.helper';

export const UserServiceCapabilityApp = {
  addCapabilitiesToUserServices: async (
    userServiceIds: UserServiceId[],
    capabilities: string[]
  ): Promise<UserService[]> => {
    const userServices =
      await UserServiceDomain.loadUserServicesByIds(userServiceIds);

    const [firstUserService] = userServices;
    if (!firstUserService || !capabilities.length) {
      return userServices;
    }

    await UserServiceCapabilityHelper.insertCapabilities(
      capabilities,
      userServices
    );

    return UserServiceDomain.loadUserServicesByIds(userServiceIds);
  },
};
