'use client';
import BadgeOverflowCounter from '@/components/ui/BadgeOverflowCounter';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable } from '@/components/ui/data-table';
import { IconActions, IconActionsItem } from '@/components/ui/IconActions';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { useDateFormatter } from '@/utils/date';
import { getDataTableLabels } from '@/utils/design-system/data-table';
import { localizedCardName } from '@/utils/services';
import { ServiceSlug } from '@/utils/shareable-resources/shareable-resources.types';
import { Chip } from '@filigran/design-system';
import { MoreVertIcon } from '@filigran/icon';
import {
  NewsFeedItemMetadataKey,
  NewsFeedItemRowFragment,
  NewsFeedItemType,
  useNewsFeedDeleteItemMutation,
  useNewsFeedListQuery,
} from '@graphql/generated';
import { newsFeedKeys } from '@graphql/news-feed/news-feed.keys';
import { keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

const DEFAULT_PAGE_SIZE = 25;

const getUrlPath = (item: NewsFeedItemRowFragment): string | undefined =>
  item.metadata.find((m) => m.key === NewsFeedItemMetadataKey.UrlPath)?.value ??
  undefined;

// A type that does not point to a resource of a library (e.g. a blog post) has no service slug
const NEWS_FEED_TYPE_TO_SERVICE_SLUG: Partial<
  Record<NewsFeedItemType, ServiceSlug>
> = {
  [NewsFeedItemType.ResourceCustomDashboard]:
    ServiceSlug.OPEN_CTI_CUSTOM_DASHBOARDS,
  [NewsFeedItemType.ResourcePlaybook]: ServiceSlug.OPEN_CTI_PLAYBOOKS,
  [NewsFeedItemType.ResourceCustomView]: ServiceSlug.OPEN_CTI_CUSTOM_VIEWS,
  [NewsFeedItemType.ResourceIntegration]: ServiceSlug.OPEN_CTI_INTEGRATIONS,
};

const NewsFeedList = () => {
  const t = useTranslate();
  const formatDate = useDateFormatter();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<
    NewsFeedItemRowFragment | undefined
  >(undefined);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const { pagination, cursor, onPaginationChange } = useTablePagination({
    pageSize,
    setPageSize,
  });

  const { data } = useNewsFeedListQuery(
    portalGraphqlClient,
    { count: pagination.pageSize, cursor },
    { placeholderData: keepPreviousData }
  );

  const { mutate: deleteNewsFeedItem, isPending: isDeleteInFlight } =
    useNewsFeedDeleteItemMutation(portalGraphqlClient);

  const newsFeedData = useMemo<NewsFeedItemRowFragment[]>(
    () => (data?.newsFeedItems.edges ?? []).map(({ node }) => node),
    [data]
  );

  const handleDelete = (item: NewsFeedItemRowFragment) => {
    deleteNewsFeedItem(
      { id: item.id },
      {
        onSuccess: async () => {
          showSnackbar({
            severity: 'success',
            title: t('NewsFeedAdminPage.DeleteSuccess', { title: item.title }),
          });
          setDeleteTarget(undefined);
          await queryClient.invalidateQueries({ queryKey: newsFeedKeys.all() });
        },
        onError: () => {
          showSnackbar({
            severity: 'error',
            title: t('NewsFeedAdminPage.DeleteError'),
          });
          setDeleteTarget(undefined);
        },
      }
    );
  };

  const columns: ColumnDef<NewsFeedItemRowFragment>[] = useMemo(
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
          if (!slug) {
            // Explicit placeholder: an empty cell reads as missing data, not as "not applicable"
            return <span>—</span>;
          }
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
                aria-label={t('Utils.OpenMenu')}
                icon={<MoreVertIcon className="h-4 w-4 text-icon-highlight" />}>
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
        {...getDataTableLabels(t)}
        tableOptions={{
          onPaginationChange,
          manualPagination: true,
          rowCount: data?.newsFeedItems.totalCount ?? 0,
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
