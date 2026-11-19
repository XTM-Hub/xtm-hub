'use client';
import { buildEpicListVariables } from '@/components/epic/epic-list-query';
import { EpicList } from '@/components/epic/EpicList';
import { EpicListSkeleton } from '@/components/epic/EpicListSkeleton';
import { useEpicFilter } from '@/hooks/use-epic-filter';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { throwOnFirstLoadError } from '@/lib/query-client';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import {
  EpicFieldsFragment,
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

  const { data } = useEpicsQuery(portalGraphqlClient, variables, {
    queryKey: epicKeys.list(variables),
    // A search keeps the current epics on screen until its results arrive.
    placeholderData: keepPreviousData,
    throwOnError: throwOnFirstLoadError,
  });

  const epics = useMemo<EpicFieldsFragment[]>(
    () => data?.epics?.edges.map(({ node }) => node) ?? [],
    [data]
  );

  if (!data) {
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
