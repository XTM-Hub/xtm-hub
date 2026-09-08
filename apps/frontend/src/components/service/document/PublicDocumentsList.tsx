import { ServiceListHeader } from '@/components/service/components/header/ServiceListHeader';
import { AppServiceListLocalStorageKeyContext } from '@/components/service/components/ServiceListLocalStorageKeyContext';
import {
  publicDocumentListItem,
  PublicDocumentListQuery,
} from '@/components/service/document/public-document.graphql';
import { PaginationControls } from '@/components/ui/pagination/PaginationControls';
import { PublicShareableResourceList } from '@/components/ui/shareable-resource/PublicShareableResourceList';
import useScrollPosition from '@/hooks/use-scroll-position';
import { useServiceListLocalStorage } from '@/hooks/use-service-list-local-storage';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { ServiceSlug } from '@/utils/shareable-resources/shareable-resources.types';
import { useShareableResourceMapping } from '@/utils/shareable-resources/use-shareable-resource-mapping';
import publicDocumentListGraphql, {
  publicDocumentList$key,
} from '@generated/publicDocumentList.graphql';
import { publicDocumentListItemFragment$key } from '@generated/publicDocumentListItemFragment.graphql';
import { publicDocumentsQuery } from '@generated/publicDocumentsQuery.graphql';
import { seoServiceInstanceFragment$data } from '@generated/seoServiceInstanceFragment.graphql';
import { useLayoutEffect, useMemo } from 'react';
import {
  PreloadedQuery,
  readInlineData,
  usePreloadedQuery,
  useRefetchableFragment,
} from 'react-relay';

interface PublicDocumentsListProps {
  serviceInstance: seoServiceInstanceFragment$data;
  queryRef: PreloadedQuery<publicDocumentsQuery>;
  baseUrl: string;
  isDecouplingConnectorsEnabled: boolean;
}

const PublicDocumentsList = ({
  queryRef,
  serviceInstance,
  baseUrl,
  isDecouplingConnectorsEnabled,
}: PublicDocumentsListProps) => {
  const queryData = usePreloadedQuery<publicDocumentsQuery>(
    PublicDocumentListQuery,
    queryRef
  );

  const [data, refetch] = useRefetchableFragment<
    publicDocumentsQuery,
    publicDocumentList$key
  >(publicDocumentListGraphql, queryData);

  const documents = useMemo(() => {
    return (data.publicDocuments?.edges ?? [])
      .map(({ node }) =>
        readInlineData<publicDocumentListItemFragment$key>(
          publicDocumentListItem,
          node
        )
      )
      .filter((l) => !!l);
  }, [data.publicDocuments]);

  const { filters, localStorageKey } = useShareableResourceMapping(
    serviceInstance.slug as ServiceSlug,
    isDecouplingConnectorsEnabled
  );

  const {
    search,
    setSearch,
    pageSize,
    setPageSize,
    displayMode: selectedDisplayMode,
    setDisplayMode,
  } = useServiceListLocalStorage(localStorageKey);

  const { restore } = useScrollPosition();

  useLayoutEffect(() => {
    restore();
  }, [restore]);

  const { pagination, onPaginationChange } = useTablePagination({
    pageSize,
    setPageSize,
    onPaginationChange: (nextPagination, nextCursor) => {
      refetch({ count: nextPagination.pageSize, cursor: nextCursor });
    },
  });

  return (
    <AppServiceListLocalStorageKeyContext localStorageKey={localStorageKey}>
      <div className="sticky top-0 py-m z-15 relative bg-gradient-background">
        <ServiceListHeader
          search={search}
          onSearchChange={setSearch}
          filters={filters}
          className="mb-3"
          onDisplayModeChange={setDisplayMode}
          paginationControls={
            <PaginationControls
              totalCount={data.publicDocuments.totalCount}
              pageSize={pageSize}
              pageIndex={pagination.pageIndex}
              onPaginationChange={onPaginationChange}
              onSetPageSize={setPageSize}
            />
          }
        />
      </div>
      <PublicShareableResourceList
        displayMode={selectedDisplayMode}
        documents={documents}
        serviceInstance={serviceInstance}
        baseUrl={baseUrl}
      />
    </AppServiceListLocalStorageKeyContext>
  );
};

export default PublicDocumentsList;
