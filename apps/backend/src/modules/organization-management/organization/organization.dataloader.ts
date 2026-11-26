import DataLoader from 'dataloader';
import { OrganizationCapability } from '../../../__generated__/resolvers-types';
import { OrganizationId } from '../../../model/kanel/public/Organization';
import { UserDomain } from '../user/user-domain/user.domain';
import { UserOrganizationDomain } from '../user/user-organization/user-organization.domain';

export interface OrganizationDataLoaders {
  administratorEmailsByOrganizationIdLoader: DataLoader<
    OrganizationId,
    string[]
  >;
  membersCountByOrganizationIdLoader: DataLoader<OrganizationId, number>;
}

export const OrganizationDataLoader = {
  batchLoadAdministratorEmails: async (
    ids: readonly OrganizationId[]
  ): Promise<string[][]> => {
    const rows = await UserDomain.loadUserEmailsByCapabilityInOrganizations(
      [...ids],
      OrganizationCapability.AdministrateOrganization
    );

    const map = new Map<string, string[]>();
    for (const row of rows) {
      const existing = map.get(row.organization_id) ?? [];
      existing.push(row.email);
      map.set(row.organization_id, existing);
    }
    return ids.map((id) => map.get(id) ?? []);
  },

  batchLoadMembersCounts: async (
    ids: readonly OrganizationId[]
  ): Promise<number[]> => {
    const rows = await UserOrganizationDomain.countUsersInOrganizations([
      ...ids,
    ]);

    const map = new Map<string, number>(
      rows.map(({ organization_id, count }) => [organization_id, count])
    );
    return ids.map((id) => map.get(id) ?? 0);
  },

  create: (): OrganizationDataLoaders => ({
    administratorEmailsByOrganizationIdLoader: new DataLoader(
      OrganizationDataLoader.batchLoadAdministratorEmails
    ),
    membersCountByOrganizationIdLoader: new DataLoader(
      OrganizationDataLoader.batchLoadMembersCounts
    ),
  }),
};
