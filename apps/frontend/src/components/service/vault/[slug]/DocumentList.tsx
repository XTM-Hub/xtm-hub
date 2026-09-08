import GuardCapacityComponent from '@/components/AdminGuard';
import {
  documentItem,
  documentsFragment,
  DocumentsListQuery,
} from '@/components/service/document/document.graphql';
import DeleteDocument from '@/components/service/vault/DeleteDocument';
import { documentListLocalStorage } from '@/components/service/vault/document-list-localstorage';
import DownloadDocument from '@/components/service/vault/DownloadDocument';
import EditDocument from '@/components/service/vault/EditDocument';
import { VaultForm } from '@/components/service/vault/VaultForm';
import VisualizeDocument from '@/components/service/vault/VisualizeDocument';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import {
  handleSortingChange,
  mapToSortingTableValue,
  transformSortingValueToParams,
} from '@/components/ui/handle-sorting.utils';
import { IconActions, IconActionsItem } from '@/components/ui/IconActions';
import { SearchInput } from '@/components/ui/SearchInput';
import useServiceCapability from '@/hooks/use-service-capability';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { DEBOUNCE_TIME } from '@/utils/constant';
import { i18nKey } from '@/utils/datatable';
import { useDateFormatter } from '@/utils/date';
import { APP_PATH } from '@/utils/path/constant';
import { MoreVertIcon } from '@filigran/icon';
import {
  Button,
  DataTable,
  DataTableHeadBarOptions,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/ui';
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
import {
  DocumentOrdering,
  OrderingMode,
  ServiceRestriction,
} from '@graphql/generated';
import { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import {
  PreloadedQuery,
  readInlineData,
  usePreloadedQuery,
  useRefetchableFragment,
} from 'react-relay';
import { useDebounceCallback } from 'usehooks-ts';

interface ServiceProps {
  queryRef: PreloadedQuery<documentsQuery>;
  serviceInstance: serviceInstance_fragment$data;
}

const DocumentList = ({ queryRef, serviceInstance }: ServiceProps) => {
  const queryData = usePreloadedQuery<documentsQuery>(
    DocumentsListQuery,
    queryRef
  );
  const t = useTranslations();
  const formatDate = useDateFormatter();
  const [editDocument, setEditDocument] = useState<
    documentItem_fragment$data | undefined
  >(undefined);
  const [deleteDocument, setDeleteDocument] = useState<
    documentItem_fragment$data | undefined
  >(undefined);
  const [data, refetch] = useRefetchableFragment<
    documentsQuery,
    documentsList$key
  >(documentsFragment, queryData);

  const canManageService = serviceInstance?.capabilities.includes(
    ServiceRestriction.ManageAccess
  );

  const documentData: documentItem_fragment$data[] = data.documents.edges.map(
    ({ node }) => readInlineData<documentItem_fragment$key>(documentItem, node)
  );

  const columns: ColumnDef<documentItem_fragment$data>[] = [
    {
      accessorKey: 'file_name',
      id: 'file_name',
      header: t('Service.Vault.FileTab.FileName'),
      size: 250,
    },
    {
      id: 'description',
      header: t('Service.Vault.FileTab.Description'),
      size: -1,
      cell: ({ row }) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className={'w-full truncate text-left'}>
              {row.original.description}
            </TooltipTrigger>
            <TooltipContent className={'max-w-lg'}>
              <p>{row.original.description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      id: 'created_at',
      header: t('Service.Vault.FileTab.UploadDate'),
      size: 100,
      cell: ({ row }) => <>{formatDate(row.original.created_at)}</>,
    },
    {
      accessorKey: 'download_number',
      id: 'download_number',
      size: 50,
      header: t('Service.Vault.FileTab.NumberDownload'),
    },
    {
      id: 'actions',
      enableHiding: false,
      enableSorting: false,
      enableResizing: false,
      size: 48,
      cell: ({ row }) => (
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-end">
          <IconActions
            icon={
              <>
                <MoreVertIcon
                  aria-hidden={true}
                  focusable={false}
                  className="h-4 w-4 text-primary"
                />
                <span className="sr-only">{t('Utils.OpenMenu')}</span>
              </>
            }>
            <GuardCapacityComponent displayError={false}>
              <IconActionsItem onClick={() => setEditDocument(row.original)}>
                {t('Utils.Update')}
              </IconActionsItem>
            </GuardCapacityComponent>
            {serviceInstance?.capabilities.some(
              (capa) => capa?.toUpperCase() === ServiceRestriction.Upload
            ) && (
              <IconActionsItem onClick={() => setEditDocument(row.original)}>
                {t('Utils.Update')}
              </IconActionsItem>
            )}
            <IconActionsItem asChild>
              <DownloadDocument documentData={row.original} />
            </IconActionsItem>
            <IconActionsItem asChild>
              <VisualizeDocument documentData={row.original} />
            </IconActionsItem>
            <GuardCapacityComponent displayError={false}>
              <IconActionsItem onClick={() => setDeleteDocument(row.original)}>
                {t('Utils.Delete')}
              </IconActionsItem>
            </GuardCapacityComponent>
            {serviceInstance?.capabilities.some(
              (capa) => capa?.toUpperCase() === ServiceRestriction.Delete
            ) && (
              <IconActionsItem onClick={() => setDeleteDocument(row.original)}>
                {t('Utils.Delete')}
              </IconActionsItem>
            )}
          </IconActions>
        </div>
      ),
    },
  ];

  const {
    pageSize,
    setPageSize,
    orderMode,
    setOrderMode,
    orderBy,
    setOrderBy,
    removeOrder,
    columnOrder,
    setColumnOrder,
    columnVisibility,
    setColumnVisibility,
    resetAll,
  } = documentListLocalStorage(columns);

  const { pagination, cursor, onPaginationChange } = useTablePagination({
    pageSize,
    setPageSize,
    onPaginationChange: (nextPagination, nextCursor) => {
      handleRefetchData({ count: nextPagination.pageSize, cursor: nextCursor });
    },
  });

  const handleRefetchData = (args?: Partial<documentsQuery$variables>) => {
    const sorting = mapToSortingTableValue(orderBy, orderMode);
    refetch({
      count: pagination.pageSize,
      cursor,
      orderBy,
      orderMode,
      ...transformSortingValueToParams<DocumentOrdering, OrderingMode>(sorting),
      ...args,
    });
  };

  const onSortingChange = (updater: unknown) => {
    handleSortingChange<DocumentOrdering>({
      updater,
      orderMode,
      setOrderMode,
      orderBy,
      setOrderBy,
      handleRefetchData,
      removeOrder,
    });
  };

  const handleInputChange = (inputValue: string) => {
    refetch({
      searchTerm: inputValue,
    });
  };

  const debounceHandleInput = useDebounceCallback(
    (e) => handleInputChange(e.target.value),
    DEBOUNCE_TIME
  );

  const breadcrumbs = [
    {
      label: 'MenuLinks.Home',
      href: `/${APP_PATH}`,
    },
    {
      label: `Service.Cards.${serviceInstance!.slug}.Name`,
      fallback: serviceInstance!.name,
    },
  ];
  const userCanUpdate = useServiceCapability(
    ServiceRestriction.Upload,
    serviceInstance
  );
  return (
    <>
      <BreadcrumbNav value={breadcrumbs} />
      <h1 className="pb-s">{serviceInstance?.name}</h1>

      <DataTable
        i18nKey={i18nKey(t)}
        columns={columns}
        data={documentData}
        onResetTable={resetAll}
        tableOptions={{
          onSortingChange: onSortingChange,
          onPaginationChange: onPaginationChange,
          onColumnOrderChange: setColumnOrder,
          onColumnVisibilityChange: setColumnVisibility,
          manualSorting: true,
          manualPagination: true,
          rowCount: data.documents.totalCount,
        }}
        onClickRow={(row) => {
          const url = `/document/visualize/${serviceInstance?.id}/${row.id}`;
          window.open(url, '_blank', 'noopener,noreferrer');
        }}
        toolbar={
          <div className="flex-col-reverse sm:flex-row flex items-center justify-between gap-s">
            <SearchInput
              containerClass="w-full sm:w-1/3"
              placeholder={t('Service.Vault.FileTab.Search')}
              onChange={debounceHandleInput}
            />
            <div className="justify-between flex w-full sm:w-auto items-center gap-s">
              <DataTableHeadBarOptions />

              {canManageService && (
                <Button
                  asChild
                  variant="secondary">
                  <Link
                    href={`/${APP_PATH}/manage/service/${documentData[0]?.service_instance?.id}/subscription/${documentData[0]?.subscription?.id}`}>
                    {t('Service.Vault.ManageVault')}
                  </Link>
                </Button>
              )}
              <VaultForm
                connectionId={data?.documents?.__id}
                userCanUpdate={userCanUpdate}
              />
            </div>
          </div>
        }
        tableState={{
          sorting: mapToSortingTableValue(orderBy, orderMode),
          pagination,
          columnOrder,
          columnVisibility,
          columnPinning: {
            right: ['actions'],
          },
        }}
      />
      {editDocument && (
        <EditDocument
          key={`edit-${editDocument.id}`}
          documentData={editDocument}
          open={!!editDocument}
          setOpen={(open) => setEditDocument(open ? editDocument : undefined)}
        />
      )}
      {deleteDocument && (
        <DeleteDocument
          key={`delete-${deleteDocument.id}`}
          documentData={deleteDocument}
          connectionId={data.documents.__id}
          open={!!deleteDocument}
          setOpen={(open) =>
            setDeleteDocument(open ? deleteDocument : undefined)
          }
        />
      )}
    </>
  );
};

export default DocumentList;
