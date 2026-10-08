'use client';
import {
  DeleteNewsFeedItemMutation,
  newsFeedItemFragment,
  newsFeedListFragment,
  NewsFeedListQuery,
} from '@/components/admin/news-feed/news-feed.graphql';
import BadgeOverflowCounter from '@/components/ui/BadgeOverflowCounter';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IconActions, IconActionsItem } from '@/components/ui/IconActions';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useTranslate } from '@/hooks/use-translate';
import { i18nKey } from '@/utils/datatable';
import { useDateFormatter } from '@/utils/date';
import { localizedCardName } from '@/utils/services';
import { ServiceSlug } from '@/utils/shareable-resources/shareable-resources.types';
import { Chip } from '@filigran/design-system';
import { MoreVertIcon } from '@filigran/icon';
import { DataTable } from '@filigran/ui';
import { newsFeedDeleteMutation } from '@generated/newsFeedDeleteMutation.graphql';
import {
  newsFeedItem_fragment$data,
  newsFeedItem_fragment$key,
  NewsFeedItemType,
} from '@generated/newsFeedItem_fragment.graphql';
import { newsFeedList_fragment$key } from '@generated/newsFeedList_fragment.graphql';
import { newsFeedListQuery } from '@generated/newsFeedListQuery.graphql';
import { NewsFeedItemMetadataKey } from '@graphql/generated';
import { ColumnDef } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  readInlineData,
  useLazyLoadQuery,
  useMutation,
  useRefetchableFragment,
} from 'react-relay';

const DEFAULT_PAGE_SIZE = 25;

const getUrlPath = (item: newsFeedItem_fragment$data): string | undefined =>
  item.metadata.find((m) => m.key === NewsFeedItemMetadataKey.UrlPath)?.value ??
  undefined;

const NEWS_FEED_TYPE_TO_SERVICE_SLUG: Record<NewsFeedItemType, ServiceSlug> = {
  RESOURCE_CUSTOM_DASHBOARD: ServiceSlug.OPEN_CTI_CUSTOM_DASHBOARDS,
  RESOURCE_PLAYBOOK: ServiceSlug.OPEN_CTI_PLAYBOOKS,
  RESOURCE_CUSTOM_VIEW: ServiceSlug.OPEN_CTI_CUSTOM_VIEWS,
  RESOURCE_INTEGRATION: ServiceSlug.OPEN_CTI_INTEGRATIONS,
};

const NewsFeedList = () => {
  const t = useTranslate();
  const formatDate = useDateFormatter();
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<
    newsFeedItem_fragment$data | undefined
  >(undefined);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const queryData = useLazyLoadQuery<newsFeedListQuery>(NewsFeedListQuery, {
    count: DEFAULT_PAGE_SIZE,
  });

  const [data, refetch] = useRefetchableFragment<
    newsFeedListQuery,
    newsFeedList_fragment$key
  >(newsFeedListFragment, queryData);

  const [deleteNewsFeedItem, isDeleteInFlight] =
    useMutation<newsFeedDeleteMutation>(DeleteNewsFeedItemMutation);

  const newsFeedData = useMemo<newsFeedItem_fragment$data[]>(
    () =>
      (data?.newsFeedItems?.edges || []).map(({ node }) =>
        readInlineData<newsFeedItem_fragment$key>(newsFeedItemFragment, node)
      ),
    [data]
  );

  const handleRefetchData = (
    args?: Partial<{ count: number; cursor: string }>
  ) => {
    refetch(
      {
        count: pagination.pageSize,
        cursor,
        ...args,
      },
      { fetchPolicy: 'store-and-network' }
    );
  };

  const { pagination, cursor, onPaginationChange } = useTablePagination({
    pageSize,
    setPageSize,
    onPaginationChange: (nextPagination, nextCursor) => {
      handleRefetchData({ count: nextPagination.pageSize, cursor: nextCursor });
    },
  });

  const handleDelete = (item: newsFeedItem_fragment$data) => {
    deleteNewsFeedItem({
      variables: { id: item.id },
      onCompleted: () => {
        showSnackbar({
          severity: 'success',
          title: t('NewsFeedAdminPage.DeleteSuccess', { title: item.title }),
        });
        setDeleteTarget(undefined);
        handleRefetchData();
      },
      onError: () => {
        showSnackbar({
          severity: 'error',
          title: t('NewsFeedAdminPage.DeleteError'),
        });
        setDeleteTarget(undefined);
      },
    });
  };

  const columns: ColumnDef<newsFeedItem_fragment$data>[] = useMemo(
    () => [
      {
        accessorKey: 'title',
        id: 'title',
        header: t('NewsFeedAdminPage.Title'),
        cell: ({ row }) => (
          <span className="truncate">{row.original.title}</span>
        ),
      },
      {
        accessorKey: 'type',
        id: 'library',
        header: t('NewsFeedAdminPage.Library'),
        cell: ({ row }) => {
          const slug = NEWS_FEED_TYPE_TO_SERVICE_SLUG[row.original.type];
          return <span>{localizedCardName({ slug, name: slug }, t)}</span>;
        },
      },
      {
        accessorKey: 'creation_date',
        id: 'creation_date',
        header: t('NewsFeedAdminPage.CreationDate'),
        cell: ({ row }) => (
          <span>{formatDate(row.original.creation_date)}</span>
        ),
      },
      {
        accessorKey: 'tags',
        id: 'tags',
        header: t('NewsFeedAdminPage.Tags'),
        cell: ({ row }) => (
          <BadgeOverflowCounter
            badges={row.original.tags.map((tag) => ({
              id: `${row.original.id}-${tag}`,
              name: tag,
            }))}
          />
        ),
      },
      {
        accessorKey: 'is_deleted',
        id: 'is_deleted',
        header: t('NewsFeedAdminPage.IsDeleted'),
        cell: ({ row }) =>
          row.original.is_deleted ? (
            <Chip
              label={t('NewsFeedAdminPage.IsDeletedYes')}
              severity="critical"
            />
          ) : null,
      },
      {
        id: 'actions',
        size: 100,
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) =>
          row.original.is_deleted ? null : (
            <div
              className="flex items-center justify-end"
              onClick={(e) => e.stopPropagation()}>
              <IconActions
                icon={
                  <>
                    <MoreVertIcon className="h-4 w-4 text-primary" />
                    <span className="sr-only">{t('Utils.OpenMenu')}</span>
                  </>
                }>
                <IconActionsItem onClick={() => setDeleteTarget(row.original)}>
                  {t('NewsFeedAdminPage.Delete')}
                </IconActionsItem>
              </IconActions>
            </div>
          ),
      },
    ],
    [t, formatDate]
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={newsFeedData}
        i18nKey={i18nKey(t)}
        tableOptions={{
          onPaginationChange,
          manualPagination: true,
          rowCount: data.newsFeedItems.totalCount,
        }}
        tableState={{ pagination, columnPinning: { right: ['actions'] } }}
        onClickRow={(row) => {
          const urlPath = getUrlPath(row.original);
          if (urlPath) {
            router.push(`/${urlPath}`);
          }
        }}
      />
      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(undefined)}
          title={t('NewsFeedAdminPage.DeleteDialog.Title')}
          confirmLabel={t('NewsFeedAdminPage.DeleteDialog.Confirm')}
          destructive
          onConfirm={() => handleDelete(deleteTarget)}
          confirmDisabled={isDeleteInFlight}>
          {t('NewsFeedAdminPage.DeleteDialog.Text', {
            title: deleteTarget.title,
          })}
        </ConfirmDialog>
      )}
    </>
  );
};

export default NewsFeedList;
