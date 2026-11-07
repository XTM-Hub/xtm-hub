'use client';
import { buildEpicListVariables } from '@/components/epic/epic-list-query';
import { EpicList } from '@/components/epic/EpicList';
import { EpicListSkeleton } from '@/components/epic/EpicListSkeleton';
import { useEpicFilter } from '@/hooks/use-epic-filter';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import {
  EpicFieldsFragment,
  EpicsQuery,
  SeoServiceInstanceItemFragment,
  useEpicsQuery,
} from '@graphql/generated';
import { epicKeys } from '@graphql/xtm-platform-roadmap/epic.keys';
import { keepPreviousData } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

interface EpicPageProps {
  serviceInstance:
    serviceInstance_fragment$data | SeoServiceInstanceItemFragment;
}

/**
 * The roadmap of both the public and the private page. The epic list is
 * prefetched on the server by `PrefetchedEpicList`, under the key read here.
 */
export const EpicPage = ({ serviceInstance }: EpicPageProps) => {
  const { selectedProducts, setSelectedProducts } = useEpicFilter();
  const [searchTerm, setSearchTerm] = useState('');
  const variables = useMemo(
    () => buildEpicListVariables(searchTerm),
    [searchTerm]
  );

  // The last list loaded, kept on screen when a search fails: its query has no
  // data of its own, and the placeholder only lasts while it loads.
  const [loadedData, setLoadedData] = useState<EpicsQuery>();

  const { data } = useEpicsQuery(portalGraphqlClient, variables, {
    queryKey: epicKeys.list(variables),
    // A search keeps the current epics on screen until its results arrive.
    placeholderData: keepPreviousData,
    // Like Relay, a failed first load reaches the error page; once a list has
    // loaded, a failed refetch or search keeps it shown.
    throwOnError: (_error, query) =>
      query.state.data === undefined && loadedData === undefined,
  });

  if (data && data !== loadedData) {
    setLoadedData(data);
  }

  const shownData = data ?? loadedData;

  const epics = useMemo<EpicFieldsFragment[]>(
    () => shownData?.epics?.edges.map(({ node }) => node) ?? [],
    [shownData]
  );

  if (!shownData) {
    return <EpicListSkeleton />;
  }

  return (
    <EpicList
      epics={epics}
      serviceInstance={serviceInstance}
      selectedProducts={selectedProducts}
      onFilterChange={setSelectedProducts}
      onSearch={setSearchTerm}
    />
  );
};
