import { toServiceListFacetCounts } from '@/components/service/components/header/filter/service-list-facet-counts';
import { useActiveAndDraftSplit } from '@/components/service/components/service-list-utils';
import { AppServiceContext } from '@/components/service/components/ServiceContext';
import ServiceList from '@/components/service/components/ServiceList';
import { AppServiceListLocalStorageKeyContext } from '@/components/service/components/ServiceListLocalStorageKeyContext';
import {
  documentItem,
  documentsFragment,
  DocumentsListQuery,
} from '@/components/service/document/document.graphql';
import { useDocumentContext } from '@/components/service/document/use-document-context';
import { PaginationControls } from '@/components/ui/pagination/PaginationControls';
import { useLogicalFiltersFromStorage } from '@/hooks/use-logical-filters-from-storage';
import {
  ServiceListLocalStorageKey,
  useServiceListLocalStorage,
} from '@/hooks/use-service-list-local-storage';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  ServiceSlug,
  SHAREABLE_RESOURCE_SERVICE_SLUG_MAPPING,
  ShareableResourceType,
} from '@/utils/shareable-resources/shareable-resources.types';
import { useShareableResourceMapping } from '@/utils/shareable-resources/use-shareable-resource-mapping';
import {
  documentItem_fragment$data,
  documentItem_fragment$key,
} from '@generated/documentItem_fragment.graphql';
import { documentsList$key } from '@generated/documentsList.graphql';
import {
  documentsQuery,
  documentsQuery$variables,
} from '@generated/documentsQuery.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { LogicalFilterInput, useDocumentFacetsQuery } from '@graphql/generated';
import { keepPreviousData } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  PreloadedQuery,
  usePreloadedQuery,
  useRefetchableFragment,
} from 'react-relay';

export interface ShareableResourceServiceListProps {
  queryRef: PreloadedQuery<documentsQuery>;
  serviceInstance: serviceInstance_fragment$data;
  search: string;
  onSearchChange: (v: string) => void;
  type: ShareableResourceType;
  localStorageKey: ServiceListLocalStorageKey;
}

/**
 * Mutualizes the behaviour shared by every shareable-resource list (integrations, custom
 * dashboards, custom views, OpenAEV scenarios, OpenCTI playbooks): loading the documents
 * connection, splitting active/draft documents, wiring the document CRUD context, and
 * rendering the paginated `ServiceList`. Resource-specific filters are passed in via
 * `additionalFilters`.
 */
const ShareableResourceServiceList = ({
  queryRef,
  serviceInstance,
  search,
  onSearchChange,
  type,
  localStorageKey,
}: ShareableResourceServiceListProps) => {
  const queryData = usePreloadedQuery<documentsQuery>(
    DocumentsListQuery,
    queryRef
  );

  const [data, refetch] = useRefetchableFragment<
    documentsQuery,
    documentsList$key
  >(documentsFragment, queryData);

  const [active, draft] = useActiveAndDraftSplit<
    documentItem_fragment$data,
    documentItem_fragment$key
  >(data?.documents.edges, documentItem);

  const connectionId = data?.documents.__id;

  const context = useDocumentContext({
    serviceInstance,
    connectionId,
    type,
  });

  const {
    pageSize,
    setPageSize,
    labels,
    entityTypes,
    integrationTypes,
    deployable,
    verified,
    productVersions,
    licenseTypes,
    solutionCategories,
  } = useServiceListLocalStorage(localStorageKey);

  const { pagination, onPaginationChange } = useTablePagination({
    pageSize,
    setPageSize,
    onPaginationChange: (nextPagination, nextCursor) => {
      refetch({
        count: nextPagination.pageSize,
        cursor: nextCursor,
      } satisfies Partial<documentsQuery$variables>);
    },
  });

  const serviceInstanceSlug = SHAREABLE_RESOURCE_SERVICE_SLUG_MAPPING[type];

  const logicalFilters = useLogicalFiltersFromStorage(
    serviceInstanceSlug === ServiceSlug.OPEN_CTI_INTEGRATIONS
      ? {
          serviceInstanceSlug: ServiceSlug.OPEN_CTI_INTEGRATIONS,
          labels,
          deployable,
          verified,
          integrationTypes,
          productVersions,
          licenseTypes,
          solutionCategories,
        }
      : {
          serviceInstanceSlug: serviceInstanceSlug as
            | ServiceSlug.OPEN_CTI_CUSTOM_DASHBOARDS
            | ServiceSlug.OPEN_AEV_SCENARIOS
            | ServiceSlug.OPEN_CTI_PLAYBOOKS
            | ServiceSlug.OPEN_CTI_CUSTOM_VIEWS,
          labels,
          entityTypes,
        }
  );

  const { data: facetData } = useDocumentFacetsQuery(
    portalGraphqlClient,
    {
      input: {
        serviceInstanceId: serviceInstance.id,
        documentType: type,
        searchTerm: search,
        // useLogicalFiltersFromStorage is shared with the (still-Relay) documents
        // query, so it's typed against Relay's LogicalFilterInput (all fields
        // optional). The react-query codegen output for the same schema input
        // type has `avoidOptionals` enabled, making fields required-but-nullable
        // instead — structurally identical at runtime, just a stricter TS shape.
        logicalFilters: logicalFilters as LogicalFilterInput,
      },
    },
    { placeholderData: keepPreviousData }
  );

  // `facetData` is `undefined` until the query has resolved at least once
  // (react-query's initial-fetch state). Returning `undefined` here — instead
  // of computing all-zero counts — lets each filter badge stay hidden rather
  // than briefly rendering "(0)" before the real counts arrive. Once fetched,
  // `placeholderData: keepPreviousData` keeps `facetData` populated across
  // refetches, so this only ever gates the very first paint.
  const facetCounts = useMemo(
    () =>
      facetData === undefined
        ? undefined
        : toServiceListFacetCounts(facetData.documentFacets),
    [facetData]
  );

  const { filters } = useShareableResourceMapping(
    serviceInstanceSlug,
    facetCounts
  );

  return (
    <AppServiceContext {...context}>
      <AppServiceListLocalStorageKeyContext localStorageKey={localStorageKey}>
        <ServiceList
          active={active}
          draft={draft}
          search={search}
          onSearchChange={onSearchChange}
          additionalFilters={filters}
          connectionId={connectionId}
          paginationControls={
            <PaginationControls
              totalCount={data.documents.totalCount}
              pageSize={pageSize}
              pageIndex={pagination.pageIndex}
              onPaginationChange={onPaginationChange}
              onSetPageSize={setPageSize}
            />
          }
        />
      </AppServiceListLocalStorageKeyContext>
    </AppServiceContext>
  );
};

export default ShareableResourceServiceList;
