import { DatabaseType, db } from '../../../knexfile';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';

interface Ownership {
  idColumn: string;
  // The table that holds the organization and the service instance, when it is not the table itself
  join?: { table: DatabaseType; column: string; ownerColumn: string };
  organizationColumn: string;
  serviceInstanceColumn?: string;
}

// How a table reaches its organization and its service instance. Add an entry when a guard has to check the ids of a new table
const OWNERSHIP: Partial<Record<DatabaseType, Ownership>> = {
  Subscription: {
    idColumn: 'Subscription.id',
    organizationColumn: 'Subscription.organization_id',
    serviceInstanceColumn: 'Subscription.service_instance_id',
  },
  User_Service: {
    idColumn: 'User_Service.id',
    join: {
      table: 'Subscription',
      column: 'User_Service.subscription_id',
      ownerColumn: 'Subscription.id',
    },
    organizationColumn: 'Subscription.organization_id',
    serviceInstanceColumn: 'Subscription.service_instance_id',
  },
};

export const ownershipOf = (table: DatabaseType): Ownership => {
  const ownership = OWNERSHIP[table];
  if (!ownership) {
    throw new Error(`No ownership is mapped for the table ${table}`);
  }
  return ownership;
};

// What the ids of the request must belong to. Each field that is set is checked, one left out is not:
// - organizationId: the ids are in this organization (left out for an admin)
// - serviceInstanceId: the ids are on this service instance
interface OwnershipScope {
  organizationId?: OrganizationId;
  serviceInstanceId?: ServiceInstanceId;
}

export const OwnershipDomain = {
  // Counts the distinct `ids` that match the scope
  countOwnedRows: async (
    table: DatabaseType,
    ids: readonly string[],
    { organizationId, serviceInstanceId }: OwnershipScope
  ): Promise<number> => {
    const ownership = ownershipOf(table);
    const query = db<object>(table).whereIn(ownership.idColumn, ids);
    if (ownership.join) {
      query.innerJoin(
        ownership.join.table,
        ownership.join.column,
        ownership.join.ownerColumn
      );
    }
    if (organizationId) {
      query.where(ownership.organizationColumn, organizationId);
    }
    if (serviceInstanceId && ownership.serviceInstanceColumn) {
      query.where(ownership.serviceInstanceColumn, serviceInstanceId);
    }
    const [row] = await query.countDistinct({ count: ownership.idColumn });
    return Number(row?.count ?? 0);
  },
};
