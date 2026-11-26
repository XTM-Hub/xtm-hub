import { DatabaseType } from '../../../knexfile';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import {
  ForbiddenErrorCode,
  NotFoundErrorCode,
} from '../../utils/error/error.code';
import { isUuid } from '../../utils/uuid.util';
import { allow, deny, TargetCheck } from './guard.types';
import { OwnershipDomain, ownershipOf } from './ownership.domain';
import { Source } from './sources';

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
