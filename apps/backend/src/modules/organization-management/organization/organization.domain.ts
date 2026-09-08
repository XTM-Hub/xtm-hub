import { db, paginate } from '../../../../knexfile';
import {
  Filter,
  FilterKey,
  OrganizationConnection,
  QueryOrganizationsArgs,
} from '../../../__generated__/resolvers-types';
import Organization, {
  OrganizationId,
  OrganizationInitializer,
  OrganizationMutator,
} from '../../../model/kanel/public/Organization';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import User, { UserId } from '../../../model/kanel/public/User';
import {
  getErrorMessage,
  getErrorStringProperty,
} from '../../../utils/error/error-guard.util';
import { UnknownErrorCode } from '../../../utils/error/error.code';
import { extractDomain } from '../../../utils/verify-email.util';

export const OrganizationDomain = {
  loadOrganizationsFromEmail: async (
    email: string
  ): Promise<Organization[]> => {
    const extractedDomain = extractDomain(email);
    if (!extractedDomain) return [];
    return OrganizationDomain.hasDomainOverlap([extractedDomain]);
  },

  hasDomainOverlap: async (domains: string[]): Promise<Organization[]> => {
    return db<Organization[]>('Organization')
      .where(function () {
        domains.forEach((domain) => {
          this.orWhereRaw('? = ANY("domains")', [domain]);
        });
      })
      .select('*');
  },

  loadOrganizationByLikeName: (name: string) => {
    return db<Organization>('Organization')
      .where('name', 'ILIKE', name)
      .first('id');
  },

  loadOrganizationSubscribedToServiceInstance: async (
    serviceInstanceId: ServiceInstanceId
  ): Promise<Organization | null> => {
    return db<Organization>('Organization')
      .leftJoin(
        'Subscription',
        'Subscription.organization_id',
        '=',
        'Organization.id'
      )
      .leftJoin(
        'ServiceInstance',
        'Subscription.service_instance_id',
        '=',
        'ServiceInstance.id'
      )
      .where({
        'ServiceInstance.id': serviceInstanceId,
      })
      .select('Organization.*')
      .first();
  },

  loadOrganizationsByUser: async (userId: UserId): Promise<Organization[]> => {
    return db<Organization>('Organization')
      .leftJoin(
        'User_Organization',
        'User_Organization.organization_id',
        '=',
        'Organization.id'
      )
      .where('User_Organization.user_id', '=', userId)
      .select('Organization.*');
  },

  loadNonPersonalSpaceOrganizationIdsByUser: async (
    userId: UserId
  ): Promise<Pick<Organization, 'id'>[]> => {
    return db<Pick<Organization, 'id'>>('Organization')
      .leftJoin(
        'User_Organization',
        'User_Organization.organization_id',
        'Organization.id'
      )
      .leftJoin('User', 'User.id', 'User_Organization.user_id')
      .where('User.id', '=', userId)
      .andWhereNot('Organization.personal_space', '=', true)
      .select('Organization.id');
  },

  loadUserByOrganization: async (
    organizationId: OrganizationId
  ): Promise<User[]> => {
    return db<User>('User')
      .leftJoin(
        'User_Organization',
        'User_Organization.user_id',
        '=',
        'User.id'
      )
      .where('User_Organization.organization_id', '=', organizationId)
      .select('User.*');
  },

  loadOrganizationBy: async (
    conditions: OrganizationMutator
  ): Promise<Organization | undefined> => {
    return db<Organization>('Organization')
      .where(conditions)
      .select('*')
      .first();
  },

  loadOrganizations: (opts: QueryOrganizationsArgs) => {
    const { first, after, orderMode, orderBy, searchTerm } = opts;
    return paginate<Organization, OrganizationConnection>('Organization', {
      first,
      after,
      orderMode,
      orderBy,
      searchTerm,
      filters: [
        {
          key: FilterKey.PersonalSpace,
          value: [false],
        } as unknown as Filter,
      ],
    });
  },

  insertNewOrganization: async (
    data: OrganizationInitializer
  ): Promise<Organization> => {
    const [createdOrganization] = await db<Organization>('Organization')
      .insert(data)
      .returning('*');

    if (!createdOrganization) {
      throw new Error(UnknownErrorCode.AddOrganizationError);
    }
    return createdOrganization;
  },

  updateOrganizationBy: async (
    field: OrganizationMutator,
    data: OrganizationMutator
  ): Promise<Organization | undefined> => {
    const [updatedOrganization] = await db<Organization>('Organization')
      .where(field)
      .update(data)
      .returning('*');

    return updatedOrganization;
  },

  deleteOrganizationBy: async (
    conditions: OrganizationMutator
  ): Promise<Organization | undefined> => {
    let deletedOrganization: Organization | undefined;
    try {
      [deletedOrganization] = await db<Organization>('Organization')
        .where(conditions)
        .delete()
        .returning('*');
    } catch (error) {
      const regexErrorName = /is still referenced from table "([^"]+)"/;
      const detail = getErrorStringProperty(error, 'detail');
      const message = getErrorMessage(error);
      const match =
        detail?.match(regexErrorName) || message.match(regexErrorName);
      if (match) {
        const tableName = match[1];
        throw new Error(`${tableName?.toUpperCase()}_STILL_IN_ORGANIZATION`, {
          cause: error,
        });
      }
      throw error;
    }
    return deletedOrganization;
  },
};
