import DataLoader from 'dataloader';
import { OrganizationCapability } from '../../../__generated__/resolvers-types';
import { OrganizationId } from '../../../model/kanel/public/Organization';
import { UserDomain } from '../user/user-domain/user.domain';

export interface OrganizationDataLoaders {
  administratorEmailsByOrganizationIdLoader: DataLoader<
    OrganizationId,
    string[]
  >;
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

  create: (): OrganizationDataLoaders => ({
    administratorEmailsByOrganizationIdLoader: new DataLoader(
      OrganizationDataLoader.batchLoadAdministratorEmails
    ),
  }),
};
