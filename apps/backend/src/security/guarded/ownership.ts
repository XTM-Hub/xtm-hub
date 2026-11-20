import { DatabaseType, db } from '../../../knexfile';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import {
  ForbiddenErrorCode,
  NotFoundErrorCode,
} from '../../utils/error/error.code';
import { isUuid } from '../../utils/uuid.util';
import { allow, deny, TargetCheck } from './guard.types';
import { Source } from './sources';

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

const ownershipOf = (table: DatabaseType): Ownership => {
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

// Checks that every id of the request belongs to what the guard checked: the organization of an
// organization guard, the organization and the service instance of a service guard, anything for an admin. One missing or
// foreign id refuses the whole request with NOT_FOUND.
// `serviceInstance` tells where the request names the service instance (for example `fromArg('service_instance_id')`):
// the ids must then also be on that service instance, whatever the guard checked
export const belongTo = <Args>(
  table: DatabaseType,
  pickIds: (args: Args) => readonly string[],
  {
    serviceInstance: readServiceInstanceId,
  }: { serviceInstance?: Source<Args, ServiceInstanceId> } = {}
): TargetCheck<Args> => {
  const ownership = ownershipOf(table);
  if (readServiceInstanceId && !ownership.serviceInstanceColumn) {
    throw new Error(`The table ${table} has no service instance`);
  }
  return async (principal, args, checked) => {
    // The same uuid in two cases is one id
    const ids = [...new Set(pickIds(args).map((id) => id.toLowerCase()))];
    if (ids.length === 0) {
      return allow();
    }
    if (!checked) {
      return deny(ForbiddenErrorCode.ForbiddenAccess);
    }
    // A malformed id would reach the query as a Postgres error
    if (!ids.every(isUuid)) {
      return deny(NotFoundErrorCode.NotFound);
    }
    const checkedServiceInstanceId =
      checked.kind === 'serviceInstance'
        ? checked.serviceInstanceId
        : undefined;
    let serviceInstanceId = checkedServiceInstanceId;
    if (readServiceInstanceId) {
      if (principal.kind !== 'user') {
        return deny(ForbiddenErrorCode.ForbiddenAccess);
      }
      // The service instance the request names
      const namedServiceInstanceId = readServiceInstanceId(principal, args);
      // A service guard already checked one: the request cannot name another
      if (
        !namedServiceInstanceId ||
        !isUuid(namedServiceInstanceId) ||
        (checkedServiceInstanceId &&
          checkedServiceInstanceId !== namedServiceInstanceId)
      ) {
        return deny(NotFoundErrorCode.NotFound);
      }
      serviceInstanceId = namedServiceInstanceId;
    }
    const count = await OwnershipDomain.countOwnedRows(table, ids, {
      organizationId:
        checked.kind === 'admin' ? undefined : checked.organizationId,
      serviceInstanceId,
    });
    return count === ids.length ? allow() : deny(NotFoundErrorCode.NotFound);
  };
};
