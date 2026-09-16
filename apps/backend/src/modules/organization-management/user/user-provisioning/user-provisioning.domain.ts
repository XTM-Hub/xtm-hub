import { v4 as uuidv4 } from 'uuid';
import { OrganizationCapability } from '../../../../__generated__/resolvers-types';
import Organization, {
  OrganizationId,
} from '../../../../model/kanel/public/Organization';
import User, {
  UserId,
  UserInitializer,
} from '../../../../model/kanel/public/User';
import { sendMail } from '../../../../server/mail-service';
import { logApp } from '../../../../utils/app-logger.util';
import {
  BadRequestErrorCode,
  UnknownErrorCode,
} from '../../../../utils/error/error.code';
import {
  BadRequestError,
  UnknownError,
} from '../../../../utils/error/error.util';
import { hashPassword } from '../../../../utils/hash-password.util';
import { isEmpty } from '../../../../utils/utils';
import { extractDomain } from '../../../../utils/verify-email.util';
import { UserOrganizationCapabilityDomain } from '../../../security-management/user-organization-capability/user-organization-capability.domain';
import { TelemetryApp } from '../../../telemetry/telemetry.app';
import { TelemetryHelper } from '../../../telemetry/telemetry.helper';
import { OrganizationDomain } from '../../organization/organization.domain';
import { UserDomain } from '../user-domain/user.domain';
import { UserOrganizationDomain } from '../user-organization/user-organization.domain';
import { UserOrganizationPendingDomain } from '../user-pending/user-organization-pending.domain';

interface WelcomeEmailOptions {
  sendWelcomeEmail?: boolean;
}

type UserProfile = Pick<
  UserInitializer,
  'email' | 'first_name' | 'last_name' | 'picture'
>;

export const UserProvisioningDomain = {
  createUser: async (
    data: UserProfile & {
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

  upsertUser: async (
    profile: UserProfile & { selected_organization_id: OrganizationId },
    { password }: { password?: string | null } = {}
  ): Promise<{ user: User; created: boolean }> => {
    const existingUser = await UserDomain.loadUserBy({
      email: profile.email,
    });

    if (existingUser) {
      const passwordFields = password ? hashPassword(password) : undefined;
      const updatedUser = await UserDomain.updateUser(existingUser.id, {
        ...(passwordFields && {
          salt: passwordFields.salt,
          password: passwordFields.hash,
        }),
        first_name: isEmpty(existingUser.first_name)
          ? profile.first_name
          : existingUser.first_name,
        last_name: isEmpty(existingUser.last_name)
          ? profile.last_name
          : existingUser.last_name,
        picture: isEmpty(existingUser.picture)
          ? profile.picture
          : existingUser.picture,
      });

      if (!updatedUser) {
        throw UnknownError(UnknownErrorCode.EditUserError);
      }

      return { user: updatedUser, created: false };
    }

    const { salt, hash } = hashPassword(password ?? '');
    const newUser = await UserDomain.insertUser({
      id: uuidv4() as UserId,
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
      picture: profile.picture,
      selected_organization_id: profile.selected_organization_id,
      salt,
      password: hash,
    });

    return { user: newUser, created: true };
  },

  linkUserAsNewOrganizationAdmin: async (
    user: User,
    email: string
  ): Promise<void> => {
    const extractedDomain = extractDomain(email);
    if (!extractedDomain) {
      throw BadRequestError(BadRequestErrorCode.InvalidEmail);
    }

    const newOrganization = await OrganizationDomain.insertNewOrganization({
      id: uuidv4() as OrganizationId,
      name: extractedDomain,
      domains: [extractedDomain],
    });

    try {
      const createOrgaEvent = TelemetryHelper.buildCreateOrganizationEvent(
        newOrganization,
        user.id
      );
      await TelemetryApp.sendTelemetryEvent(createOrgaEvent);
    } catch (error) {
      logApp.error('Unable to send telemetry event for create organization', {
        error,
      });
    }

    const [userOrgRelation] =
      await UserOrganizationDomain.createUserOrganizationRelation({
        user_id: user.id,
        organizations_id: [newOrganization.id],
      });

    if (!userOrgRelation) {
      throw UnknownError(UnknownErrorCode.AddingUserError);
    }

    await UserOrganizationCapabilityDomain.createUserOrganizationCapability({
      user_organization_id: userOrgRelation.id,
      capabilities_name: [OrganizationCapability.AdministrateOrganization],
    });
  },

  linkUserToPendingOrganization: async (
    user: User,
    organization: Organization
  ): Promise<void> => {
    await UserOrganizationPendingDomain.insertNewUserOrganizationPending({
      user_id: user.id,
      organization_id: organization.id,
    });
  },
};
