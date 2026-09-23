'use client';
import {
  EpicListQuery,
  epicsListFragment,
} from '@/components/epic/epic.graphql';
import { EpicPage } from '@/components/epic/EpicPage';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { useTranslate } from '@/hooks/use-translate';
import { APP_PATH } from '@/utils/path/constant';
import { epic_fragment$data } from '@generated/epic_fragment.graphql';
import { epicsList_epics$key } from '@generated/epicsList_epics.graphql';
import { epicsQuery } from '@generated/epicsQuery.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { useLazyLoadQuery, useRefetchableFragment } from 'react-relay';
interface PreloaderProps {
  serviceInstance: serviceInstance_fragment$data;
}

const PageLoader = ({ serviceInstance }: PreloaderProps) => {
  const t = useTranslate();
  const queryData = useLazyLoadQuery<epicsQuery>(
    EpicListQuery,
    { count: 500, orderBy: 'title', orderMode: 'asc' },
    { fetchPolicy: 'network-only' }
  );
  const [data, refetch] = useRefetchableFragment<
    epicsQuery,
    epicsList_epics$key
  >(epicsListFragment, queryData);

  const epics =
    data.epics?.edges.map((epic) => epic?.node as epic_fragment$data) ?? [];

  const connectionID = data.epics!.__id;

  const breadcrumbValue = [
    {
      label: 'MenuLinks.Home',
      href: `/${APP_PATH}`,
    },
    {
      label: 'Epic.XTMRoadmap',
    },
  ];

  const handleSearch = (searchTerm: string) => {
    refetch({ searchTerm: searchTerm || undefined });
  };
  return (
    <>
      <BreadcrumbNav value={breadcrumbValue} />
      <h1 className="sr-only">{t('Epic.XTMRoadmap')}</h1>
      <EpicPage
        connectionID={connectionID}
        serviceInstance={serviceInstance}
        epics={epics}
        onSearch={handleSearch}
      />
    </>
  );
};

export default PageLoader;
