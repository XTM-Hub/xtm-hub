'use client';
import { DataTable, DataTableHeadBarOptions } from '@/components/ui/data-table';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { getDataTableLabels } from '@/utils/design-system/data-table';
import { removeFromQueryCache } from '@/utils/query-cache';
import { DeleteIcon, EditIcon } from '@filigran/icon';
import { competitorListKeys } from '@graphql/competitor/competitor-list.keys';
import {
  CompetitorDeleteMutation,
  CompetitorOrdering,
  CompetitorRowFragment,
  CompetitorsListQuery,
  OrderingMode,
  useCompetitorDeleteMutation,
  useCompetitorsListQuery,
} from '@graphql/generated';
import { keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

import ManageCompetitor from '@/components/competitor/ManageCompetitor';
import { useCompetitorListLocalstorage } from '@/components/competitor/competitor-localstorage';
import { formatTier } from '@/components/competitor/competitor.utils';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  handleSortingChange,
  mapToSortingTableValue,
} from '@/components/ui/handle-sorting.utils';
import { Button, IconButton } from '@filigran/design-system';

const CompetitorList = () => {
  const t = useTranslate();
  const queryClient = useQueryClient();
  const [editRow, setEditRow] = useState<CompetitorRowFragment | undefined>(
    undefined
  );

  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  const {
    pageSize,
    setPageSize,
    orderMode,
    setOrderMode,
    orderBy,
    setOrderBy,
    resetAll,
    removeOrder,
  } = useCompetitorListLocalstorage();

  const { pagination, cursor, onPaginationChange } = useTablePagination({
    pageSize,
    setPageSize,
  });

  const variables = useMemo(
    () => ({
      count: pagination.pageSize,
      cursor,
      orderBy,
      orderMode: orderMode as OrderingMode,
    }),
    [orderBy, orderMode, pagination, cursor]
  );

  const { data: queryData, isLoading } = useCompetitorsListQuery(
    portalGraphqlClient,
    variables,
    {
      placeholderData: keepPreviousData,
      // Like Relay, a failed load reaches the admin error page; a failed background refetch keeps the rows shown.
      throwOnError: (_error, query) => query.state.data === undefined,
    }
  );

  const { mutate: deleteCompetitor } = useCompetitorDeleteMutation(
    portalGraphqlClient,
    {
      onSuccess: async (data: CompetitorDeleteMutation) => {
        queryClient.setQueriesData<CompetitorsListQuery>(
          { queryKey: competitorListKeys.all() },
          removeFromQueryCache('competitors', data.deleteCompetitor.id)
        );
        await queryClient.invalidateQueries({
          queryKey: competitorListKeys.all(),
        });
      },
    }
  );

  const competitorsData = useMemo<CompetitorRowFragment[]>(() => {
    const edges = queryData?.competitors.edges ?? [];
    return edges.map(({ node }) => node);
  }, [queryData]);
  const totalCount = queryData?.competitors.totalCount ?? 0;

  const columns: ColumnDef<CompetitorRowFragment>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        id: 'name',
        header: t('CompetitorListPage.Name'),
        cell: ({ row }) => (
          <span className="truncate">{row.original.name}</span>
        ),
      },
      {
        accessorKey: 'tier',
        id: 'tier',
        header: t('CompetitorListPage.Tier'),
        cell: ({ row }) => (
          <span className="truncate">{formatTier(row.original.tier)}</span>
        ),
      },
      {
        accessorKey: 'domain',
        id: 'domain',
        header: t('CompetitorListPage.Domain'),
        cell: ({ row }) => (
          <span className="truncate">{row.original.domain}</span>
        ),
      },
      {
        id: 'actions',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <IconButton
              priority="tertiary"
              aria-label={t('CompetitorListPage.Edit')}
              icon={<EditIcon className="h-4 w-4" />}
              onClick={(e) => {
                e.stopPropagation();
                setEditRow(row.original);
                setOpenEdit(true);
              }}
            />
            <ConfirmDialog
              title={t('CompetitorListPage.DeleteDialog.Title')}
              confirmLabel={t('CompetitorListPage.Delete')}
              destructive
              trigger={
                <IconButton
                  variant="destructive"
                  priority="tertiary"
                  aria-label={t('CompetitorListPage.Delete')}
                  icon={<DeleteIcon className="h-4 w-4" />}
                />
              }
              onConfirm={(e) => {
                e.stopPropagation();
                deleteCompetitor({ id: row.original.id });
              }}>
              {t('CompetitorListPage.DeleteDialog.Text', {
                name: row.original.name,
              })}
            </ConfirmDialog>
          </div>
        ),
      },
    ],
    [t, deleteCompetitor]
  );

  const onSortingChange = (updater: unknown) => {
    handleSortingChange<CompetitorOrdering>({
      updater,
      orderBy,
      orderMode,
      setOrderBy,
      setOrderMode,
      removeOrder,
      handleRefetchData: () => undefined,
    });
  };

  return (
    <>
      <DataTable
        columns={columns}
        data={competitorsData}
        isLoading={isLoading}
        {...getDataTableLabels(t)}
        onResetTable={resetAll}
        tableOptions={{
          onSortingChange,
          onPaginationChange,
          manualSorting: true,
          manualPagination: true,
          rowCount: totalCount,
        }}
        tableState={{
          sorting: mapToSortingTableValue(orderBy, orderMode),
          pagination,
          columnPinning: {
            right: ['actions'],
          },
        }}
        toolbar={
          <div className="flex w-full items-center justify-end gap-2">
            <DataTableHeadBarOptions />
            <Button onClick={() => setOpenAdd(true)}>
              {t('CompetitorListPage.AddCompetitor')}
            </Button>
          </div>
        }
      />
      <ManageCompetitor
        listVariables={variables}
        open={openAdd}
        setOpen={setOpenAdd}
      />
      {editRow && (
        <ManageCompetitor
          competitor={editRow}
          listVariables={variables}
          open={openEdit}
          setOpen={setOpenEdit}
        />
      )}
    </>
  );
};

export default CompetitorList;
