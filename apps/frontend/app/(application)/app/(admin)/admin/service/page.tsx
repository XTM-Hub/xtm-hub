'use client';
import AdminServiceTab, {
  ADMIN_SERVICE_TAB_SERVICE_DEFINITION_IDENTIFIERS,
} from '@/components/service/AdminServiceTab';
import {
  ServiceListQuery,
  servicesListFragment,
} from '@/components/service/service.graphql';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { useTranslate } from '@/hooks/use-translate';
import { serviceList_fragment$data } from '@generated/serviceList_fragment.graphql';
import { serviceQuery } from '@generated/serviceQuery.graphql';
import { servicesList_services$key } from '@generated/servicesList_services.graphql';
import { ServiceInstanceFilterKey } from '@graphql/generated';
import { useLazyLoadQuery, useRefetchableFragment } from 'react-relay';

const breadcrumbValue = [
  {
    label: 'MenuLinks.Settings',
  },
  {
    label: 'MenuLinks.Service',
  },
];

const Page = () => {
  const t = useTranslate();

  const queryData = useLazyLoadQuery<serviceQuery>(ServiceListQuery, {
    count: 50,
    orderBy: 'name',
    orderMode: 'asc',
    searchTerm: '',
    includeInaccessible: true,
    filters: [
      {
        key: ServiceInstanceFilterKey.ServiceDefinitionIdentifier,
        value: ADMIN_SERVICE_TAB_SERVICE_DEFINITION_IDENTIFIERS,
      },
    ],
  });
  const [data, refetch] = useRefetchableFragment<
    serviceQuery,
    servicesList_services$key
  >(servicesListFragment, queryData);
  const serviceData = data?.serviceInstances?.edges.map(
    (service) => service?.node as serviceList_fragment$data
  );
  return (
    <>
      <BreadcrumbNav value={breadcrumbValue} />
      <h1 className="sr-only">{t('MenuLinks.Service')}</h1>
      <AdminServiceTab
        serviceData={serviceData}
        refetch={refetch}
      />
    </>
  );
};

export default Page;
