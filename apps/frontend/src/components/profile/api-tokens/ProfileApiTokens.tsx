'use client';

import {
  ApiTokenStatus,
  getApiTokenStatus,
  sortApiTokens,
} from '@/components/profile/api-tokens/api-token.utils';
import { CreateApiTokenDialog } from '@/components/profile/api-tokens/CreateApiTokenDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable } from '@/components/ui/data-table';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { useDateFormatter } from '@/utils/date';
import { getDataTableLabels } from '@/utils/design-system/data-table';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardSubtitle,
  CardTitle,
  Chip,
  ChipSeverity,
} from '@filigran/design-system';
import { apiTokenKeys } from '@graphql/api-token/api-token.keys';
import {
  ApiTokenRowFragment,
  useApiTokenRevokeMutation,
  useApiTokensQuery,
} from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

const STATUS_SEVERITY: Record<ApiTokenStatus, ChipSeverity> = {
  active: 'low',
  expired: 'medium',
  revoked: 'neutral',
};

export const ProfileApiTokens = () => {
  const t = useTranslate();
  const formatDate = useDateFormatter();
  const queryClient = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);

  const { data, isLoading } = useApiTokensQuery(portalGraphqlClient);

  const { mutate: revokeApiToken } = useApiTokenRevokeMutation(
    portalGraphqlClient,
    {
      onSuccess: async ({ revokeApiToken: revoked }) => {
        showSnackbar({
          severity: 'success',
          title: t('ApiTokens.Revoked', { name: revoked.name }),
        });
        await queryClient.invalidateQueries({ queryKey: apiTokenKeys.all() });
      },
      onError: (error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : 'UNKNOWN_ERROR';
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: t(`Error.Server.${errorMessage}`),
        });
      },
    }
  );

  const tokens = useMemo(
    () => sortApiTokens(data?.apiTokens ?? []),
    [data?.apiTokens]
  );

  const columns: ColumnDef<ApiTokenRowFragment>[] = useMemo(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: t('ApiTokens.Column.Name'),
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <span className="truncate">{row.original.name}</span>
            <span className="truncate font-mono text-sm text-default-secondary">
              {`${row.original.token_prefix}…`}
            </span>
          </div>
        ),
      },
      {
        id: 'organization',
        accessorKey: 'organization_name',
        header: t('ApiTokens.Column.Organization'),
        cell: ({ row }) => (
          <span className="truncate">{row.original.organization_name}</span>
        ),
      },
      {
        id: 'scope',
        accessorKey: 'scope',
        header: t('ApiTokens.Column.Scope'),
        cell: ({ row }) => t(`ApiTokens.Scope.${row.original.scope}`),
      },
      {
        id: 'status',
        header: t('ApiTokens.Column.Status'),
        enableSorting: false,
        cell: ({ row }) => {
          const status = getApiTokenStatus(row.original);
          return (
            <Chip
              label={t(`ApiTokens.Status.${status}`)}
              severity={STATUS_SEVERITY[status]}
            />
          );
        },
      },
      {
        id: 'expires_at',
        accessorKey: 'expires_at',
        header: t('ApiTokens.Column.Expires'),
        cell: ({ row }) => formatDate(row.original.expires_at, 'DATE_MEDIUM'),
      },
      {
        id: 'last_used_at',
        accessorKey: 'last_used_at',
        header: t('ApiTokens.Column.LastUsed'),
        cell: ({ row }) =>
          formatDate(row.original.last_used_at, 'DATE_MEDIUM') ??
          t('ApiTokens.NeverUsed'),
      },
      {
        id: 'actions',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) =>
          getApiTokenStatus(row.original) === 'active' ? (
            <div className="flex justify-end">
              <ConfirmDialog
                confirmAnalyticsId="account_api_token_revocation_confirm"
                title={t('ApiTokens.RevokeDialog.Title')}
                confirmLabel={t('ApiTokens.Revoke')}
                destructive
                trigger={
                  <Button
                    variant="destructive"
                    priority="tertiary"
                    {...analyticsId('account_api_token_remove')}
                    aria-label={t('ApiTokens.RevokeNamed', {
                      name: row.original.name,
                    })}>
                    {t('ApiTokens.Revoke')}
                  </Button>
                }
                onConfirm={() => revokeApiToken({ id: row.original.id })}>
                {t('ApiTokens.RevokeDialog.Text', { name: row.original.name })}
              </ConfirmDialog>
            </div>
          ) : null,
      },
    ],
    [t, formatDate, revokeApiToken]
  );

  return (
    <Card>
      <CardHeader
        action={
          <Button
            {...analyticsId('account_api_token_open')}
            onClick={() => setOpenCreate(true)}>
            {t('ApiTokens.Create.Open')}
          </Button>
        }>
        <CardTitle as="h3">{t('ApiTokens.Title')}</CardTitle>
        <CardSubtitle>{t('ApiTokens.Description')}</CardSubtitle>
      </CardHeader>
      <CardContent clamp={0}>
        {!isLoading && tokens.length === 0 ? (
          <p className="text-default-secondary">{t('ApiTokens.Empty')}</p>
        ) : (
          <DataTable
            columns={columns}
            data={tokens}
            isLoading={isLoading}
            {...getDataTableLabels(t)}
            tableState={{
              columnPinning: { right: ['actions'] },
            }}
          />
        )}
      </CardContent>
      <CreateApiTokenDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
      />
    </Card>
  );
};
