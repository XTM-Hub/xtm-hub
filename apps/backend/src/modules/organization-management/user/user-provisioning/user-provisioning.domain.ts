import { v4 as uuidv4 } from 'uuid';
import { OrganizationCapability } from '../../../../__generated__/resolvers-types';
import { OrganizationId } from '../../../../model/kanel/public/Organization';
import User, {
  UserId,
  UserInitializer,
} from '../../../../model/kanel/public/User';
import { sendMail } from '../../../../server/mail-service';
import { UnknownErrorCode } from '../../../../utils/error/error.code';
import { UnknownError } from '../../../../utils/error/error.util';
import { hashPassword } from '../../../../utils/hash-password.util';
import { UserOrganizationCapabilityDomain } from '../../../security-management/user-organization-capability/user-organization-capability.domain';
import { OrganizationDomain } from '../../organization/organization.domain';
import { UserDomain } from '../user-domain/user.domain';
import { UserOrganizationDomain } from '../user-organization/user-organization.domain';

interface WelcomeEmailOptions {
  sendWelcomeEmail?: boolean;
}

export const UserProvisioningDomain = {
  createUser: async (
    data: Pick<
      UserInitializer,
      'email' | 'first_name' | 'last_name' | 'picture'
    > & {
      password?: string | null;
      selected_organization_id?: OrganizationId;
    },
    { sendWelcomeEmail = true }: WelcomeEmailOptions = {}
  ): Promise<User> => {
    const { salt, hash } = hashPassword(data.password ?? '');
    const uuid = uuidv4();
    const personalSpaceOrganization =
      await OrganizationDomain.insertNewOrganization({
        id: uuid as unknown as OrganizationId,
        name: data.email,
        personal_space: true,
      });

    const addedUser = await UserDomain.insertUser({
      id: uuid as UserId,
      selected_organization_id:
        data.selected_organization_id ?? personalSpaceOrganization.id,
      salt,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      picture: data.picture,
      password: hash,
    });

    const [userOrgRelation] =
      await UserOrganizationDomain.createUserOrganizationRelation({
        user_id: addedUser.id,
        organizations_id: [personalSpaceOrganization.id],
      });

    if (!userOrgRelation) {
      throw UnknownError(UnknownErrorCode.AddingUserError);
    }

    await UserOrganizationCapabilityDomain.createUserOrganizationCapability({
      user_organization_id: userOrgRelation.id,
      capabilities_name: [OrganizationCapability.AdministrateOrganization],
    });

    if (sendWelcomeEmail) {
      await sendMail({
        to: addedUser.email,
        template: 'welcome',
        params: {},
      });
    }

    return addedUser;
  },
};
