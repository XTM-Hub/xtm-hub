'use client';
import Loader from '@/components/Loader';
import AdminServiceTab, {
  ADMIN_SERVICE_TAB_SERVICE_DEFINITION_IDENTIFIERS,
  AdminServiceListVariablesChange,
} from '@/components/service/AdminServiceTab';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { throwOnFirstLoadError } from '@/lib/query-client';
import {
  type AdminServiceInstancesListQueryVariables,
  OrderingMode,
  ServiceInstanceFilterKey,
  ServiceInstanceOrdering,
  useAdminServiceInstancesListQuery,
} from '@graphql/generated';
import { adminServiceInstancesKeys } from '@graphql/service-instances/service-instances.keys';
import { keepPreviousData } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

const DEFAULT_PAGE_SIZE = 50;

const INITIAL_VARIABLES: AdminServiceInstancesListQueryVariables = {
  count: DEFAULT_PAGE_SIZE,
  orderBy: ServiceInstanceOrdering.Name,
  orderMode: OrderingMode.Asc,
  searchTerm: '',
  includeInaccessible: true,
  filters: [
    {
      key: ServiceInstanceFilterKey.ServiceDefinitionIdentifier,
      value: ADMIN_SERVICE_TAB_SERVICE_DEFINITION_IDENTIFIERS,
    },
  ],
};

const AdminServiceList = () => {
  const [variables, setVariables] = useState(INITIAL_VARIABLES);
  const { data } = useAdminServiceInstancesListQuery(
    portalGraphqlClient,
    variables,
    {
      queryKey: adminServiceInstancesKeys.list(variables),
      // A search or a filter keeps the current services until the new ones arrive.
      placeholderData: keepPreviousData,
      throwOnError: throwOnFirstLoadError,
    }
  );

  const onVariablesChange = useCallback<AdminServiceListVariablesChange>(
    (change) => setVariables((current) => ({ ...current, ...change })),
    []
  );

  const serviceData = useMemo(
    () =>
      data?.serviceInstances.edges.flatMap(({ node }) => (node ? [node] : [])),
    [data]
  );

  if (!serviceData) {
    return <Loader />;
  }

  return (
    <AdminServiceTab
      serviceData={serviceData}
      onVariablesChange={onVariablesChange}
    />
  );
};

export default AdminServiceList;
