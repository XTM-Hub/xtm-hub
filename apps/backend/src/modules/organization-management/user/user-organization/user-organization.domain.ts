import { db } from '../../../../../knexfile';
import {
  OrganizationCapabilitiesInput,
  OrganizationCapability,
} from '../../../../__generated__/resolvers-types';
import { requestContext } from '../../../../context/request.context';
import Organization, {
  OrganizationId,
} from '../../../../model/kanel/public/Organization';
import {
  SubscriptionId,
  SubscriptionMutator,
} from '../../../../model/kanel/public/Subscription';
import User, { UserId } from '../../../../model/kanel/public/User';
import UserOrganization, {
  UserOrganizationId,
  UserOrganizationInitializer,
  UserOrganizationMutator,
} from '../../../../model/kanel/public/UserOrganization';
import UserOrganizationPending from '../../../../model/kanel/public/UserOrganizationPending';
import { securityGuard } from '../../../../security/guard';
import { sendMail } from '../../../../server/mail-service';
import {
  ForbiddenErrorCode,
  NotFoundErrorCode,
  UnknownErrorCode,
} from '../../../../utils/error/error.code';
import {
  ForbiddenAccess,
  NotFoundError,
  UnknownError,
} from '../../../../utils/error/error.util';
import { isEmpty } from '../../../../utils/utils';
import { UserOrganizationCapabilityDomain } from '../../../security-management/user-organization-capability/user-organization-capability.domain';
import { SubscriptionDomain } from '../../../subscription/subscription.domain';
import { OrganizationDomain } from '../../organization/organization.domain';
import { UserOrganizationPendingDomain } from '../user-pending/user-organization-pending.domain';

export const UserOrganizationDomain = {
  insertNewUserOrganization: (
    field: UserOrganizationInitializer | UserOrganizationInitializer[]
  ): Promise<UserOrganization[]> => {
    return db<UserOrganization>('User_Organization')
      .insert(field)
      .returning('*');
  },

  createUserOrganizationRelationAndRemovePending: async ({
    user_id,
    organizations_id = [],
  }: {
    user_id: UserId;
    organizations_id: OrganizationId[];
  }): Promise<UserOrganization[]> => {
    await Promise.all(
      organizations_id.map((org) =>
        UserOrganizationPendingDomain.removeUserFromOrganizationPending(
          user_id,
          org
        )
      )
    );

    return UserOrganizationDomain.createUserOrganizationRelation({
      user_id,
      organizations_id,
    });
  },

  createUserOrganizationRelation: async ({
    user_id,
    organizations_id = [],
  }: {
    user_id: UserId;
    organizations_id: OrganizationId[];
  }): Promise<UserOrganization[]> => {
    const usersOrganization: UserOrganizationInitializer[] =
      organizations_id.map((organization_id) => ({
        user_id,
        organization_id,
      }));
    return UserOrganizationDomain.insertNewUserOrganization(usersOrganization);
  },

  loadUserOrganization: (
    field: UserOrganizationMutator
  ): Promise<UserOrganization[]> => {
    return db<UserOrganization>('User_Organization').where(field);
  },

  ensureUserOrganizationExists: async (
    user_id: UserId,
    organization_id: OrganizationId
  ): Promise<{ id: UserOrganizationId }> => {
    const existing = await db<UserOrganization>('User_Organization')
      .where({ user_id, organization_id })
      .first();
    if (existing) {
      return { id: existing.id };
    }

    const [inserted] = await UserOrganizationDomain.insertNewUserOrganization({
      user_id,
      organization_id,
    });
    if (!inserted) {
      throw new Error(UnknownErrorCode.UnknownError);
    }
    return { id: inserted.id };
  },

  updateMultipleUserOrgWithCapabilities: async (
    userId: UserId,
    orgCapabilities: OrganizationCapabilitiesInput[] | null = []
  ) => {
    await db<UserOrganization>('User_Organization')
      .where('user_id', '=', userId)
      .whereNot('organization_id', userId) // Should not touch personal space
      .del();
    if (!orgCapabilities || isEmpty(orgCapabilities)) {
      return;
    }
    for (const orgCapa of orgCapabilities) {
      const organization_id = orgCapa.organization_id;
      if (organization_id !== userId.toString()) {
        const [newUserOrganization] =
          await UserOrganizationDomain.insertNewUserOrganization({
            user_id: userId,
            organization_id,
          });
        if (!newUserOrganization) {
          throw new Error(UnknownErrorCode.UnknownError);
        }
        await UserOrganizationCapabilityDomain.createUserOrganizationCapability(
          {
            user_organization_id: newUserOrganization.id,
            capabilities_name: orgCapa.capabilities,
          }
        );
      }
    }
    return true;
  },

  updateUserOrgCapabilities: async ({
    user_id,
    organization_id,
    orgCapabilities,
  }: {
    user_id: UserId;
    organization_id: OrganizationId;
    orgCapabilities?: string[] | null;
  }) => {
    await securityGuard.assertUserCapabilities(
      [
        OrganizationCapability.AdministrateOrganization,
        OrganizationCapability.ManageAccess,
      ],
      organization_id
    );

    const [userOrganization] =
      await UserOrganizationDomain.loadUserOrganization({
        user_id,
        organization_id,
      });
    if (!userOrganization) {
      throw new Error(UnknownErrorCode.UnknownError);
    }
    await UserOrganizationCapabilityDomain.updateUserOrganizationCapability({
      user_organization_id: userOrganization.id,
      capabilities_name: orgCapabilities,
    });
    return true;
  },

  createUserOrgCapabilities: async ({
    user,
    organization,
    orgCapabilities,
    userExists,
  }: {
    user: User;
    organization: Organization;
    orgCapabilities: string[];
    userExists: boolean;
  }) => {
    const [userOrganization] =
      await UserOrganizationDomain.insertNewUserOrganization({
        user_id: user.id,
        organization_id: organization.id,
      });
    if (!userOrganization) {
      throw new Error(UnknownErrorCode.UnknownError);
    }
    const contextUser = requestContext.requireUser();
    await securityGuard.assertUserCapabilities(
      [
        OrganizationCapability.AdministrateOrganization,
        OrganizationCapability.ManageAccess,
      ],
      organization.id
    );

    await UserOrganizationCapabilityDomain.updateUserOrganizationCapability({
      user_organization_id: userOrganization.id,
      capabilities_name: orgCapabilities,
    });
    if (userExists) {
      await sendMail({
        to: user.email,
        template: 'new_user_organization',
        params: {
          organizationName: organization.name,
          userName: `${contextUser.first_name ?? ''} ${contextUser.last_name ?? ''}`,
          invitedName: `${user.first_name ?? ''} ${user.last_name ?? ''}`,
        },
      });
    }
    return true;
  },

  removeUserFromOrganization: async (
    user_id: UserId,
    organization_id: OrganizationId
  ) => {
    return db<UserOrganization>('User_Organization')
      .where({ user_id, organization_id })
      .delete('*');
  },

  areAllUsersInOrganization: async (
    userIds: UserId[],
    organizationId: OrganizationId
  ): Promise<boolean> => {
    if (userIds.length === 0) {
      return true;
    }
    const rows: UserOrganization[] = await db<UserOrganization>(
      'User_Organization'
    )
      .whereIn('user_id', userIds)
      .andWhere('organization_id', organizationId);
    return (
      new Set(rows.map((row) => row.user_id)).size === new Set(userIds).size
    );
  },

  countUsersInOrganization: async (
    organization_id: OrganizationId
  ): Promise<number> => {
    const result = await db<UserOrganization>('User_Organization')
      .where({ organization_id })
      .count<[{ count: string }]>('user_id as count')
      .first();
    return Number(result?.count ?? 0);
  },

  // Locks the organization's membership rows for the lifetime of the current
  // transaction, so a concurrent request touching the same organization's
  // memberships (e.g. another user deletion) is serialized behind this one.
  // Must be called from within a `withTransaction` block.
  lockOrganizationMembers: async (
    organization_id: OrganizationId
  ): Promise<UserOrganization[]> => {
    return db<UserOrganization>('User_Organization')
      .where({ organization_id })
      .forUpdate();
  },

  removeUserFromPendingList: async ({
    user_id,
    organization_id,
  }: {
    user_id: UserId;
    organization_id: OrganizationId;
  }) => {
    return db<UserOrganizationPending>('User_Organization_Pending')
      .where({
        user_id,
        organization_id,
      })
      .del()
      .returning('id');
  },

  countOrganizationAdministrators: async (
    organizationId: OrganizationId
  ): Promise<number> => {
    const [administratorsCount] = await db('Organization')
      .count('Organization.id')
      .leftJoin(
        'User_Organization',
        'User_Organization.organization_id',
        'Organization.id'
      )
      .leftJoin(
        'UserOrganization_Capability',
        'UserOrganization_Capability.user_organization_id',
        'User_Organization.id'
      )
      .where('Organization.id', '=', organizationId)
      .andWhere(
        'UserOrganization_Capability.name',
        '=',
        OrganizationCapability.AdministrateOrganization
      )
      .groupBy('Organization.id');

    return Number(administratorsCount?.count ?? 0);
  },

  isFirstInOrganization: async (
    organizationId: OrganizationId
  ): Promise<boolean> => {
    const userOrganization = await UserOrganizationDomain.loadUserOrganization({
      organization_id: organizationId,
    });
    return userOrganization.length === 1;
  },

  linkUserToSubscriptionOrganization: async (
    user: User,
    subscriptionId: SubscriptionId
  ): Promise<void> => {
    const [subscription] =
      await SubscriptionDomain.loadSubscriptionWithOrganizationAndCapabilitiesBy(
        {
          'Subscription.id': subscriptionId,
        } as SubscriptionMutator
      );
    const [organization] = await OrganizationDomain.loadOrganizationsFromEmail(
      user.email
    );
    if (!organization) {
      throw NotFoundError(NotFoundErrorCode.UserNotFound);
    }
    const userOrganization = await UserOrganizationDomain.loadUserOrganization({
      user_id: user.id,
      organization_id: organization.id,
    });
    if (subscription.organization_id !== organization.id) {
      throw ForbiddenAccess(ForbiddenErrorCode.EmailOutsideOrganizationError);
    }
    if (isEmpty(userOrganization)) {
      const [userOrgRelation] =
        await UserOrganizationDomain.createUserOrganizationRelationAndRemovePending(
          {
            user_id: user.id,
            organizations_id: [organization.id],
          }
        );
      if (!userOrgRelation) {
        throw UnknownError(UnknownErrorCode.AddingUserError);
      }
      const shouldBeAdminOrga =
        await UserOrganizationDomain.isFirstInOrganization(organization.id);
      if (shouldBeAdminOrga) {
        await UserOrganizationCapabilityDomain.createUserOrganizationCapability(
          {
            user_organization_id: userOrgRelation.id,
            capabilities_name: [
              OrganizationCapability.AdministrateOrganization,
            ],
          }
        );
      }
    }
  },
};
