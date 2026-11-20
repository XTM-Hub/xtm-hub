'use client';

import {
  API_TOKEN_FILTER_ALL,
  API_TOKEN_SCOPES,
  ApiTokenFilters,
  ApiTokenStatus,
  DEFAULT_API_TOKEN_FILTERS,
  filterApiTokens,
  getApiTokenOrganizations,
  getApiTokenStatus,
  getServerErrorKey,
  sortApiTokens,
} from '@/components/profile/api-tokens/api-token.utils';
import { CreateApiTokenDialog } from '@/components/profile/api-tokens/CreateApiTokenDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  DataTable,
  DataTableHeadBarOptions,
  DataTableToolbar,
} from '@/components/ui/data-table';
import { SelectField } from '@/components/ui/SelectField';
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
  CardDescription,
  CardHeader,
  CardTitle,
  Chip,
  ChipSeverity,
  SearchField,
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

const API_TOKEN_STATUSES: ApiTokenStatus[] = ['active', 'expired', 'revoked'];

export const ProfileApiTokens = () => {
  const t = useTranslate();
  const formatDate = useDateFormatter();
  const queryClient = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [filters, setFilters] = useState<ApiTokenFilters>(
    DEFAULT_API_TOKEN_FILTERS
  );
  const setFilter = (key: keyof ApiTokenFilters) => (value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));

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
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: t(getServerErrorKey(error, t.has)),
        });
      },
    }
  );

  const tokens = useMemo(
    () => sortApiTokens(data?.apiTokens ?? []),
    [data?.apiTokens]
  );
  const visibleTokens = useMemo(
    () => filterApiTokens(tokens, filters),
    [tokens, filters]
  );
  const organizations = useMemo(
    () => getApiTokenOrganizations(tokens),
    [tokens]
  );

  const columns: ColumnDef<ApiTokenRowFragment>[] = useMemo(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        // -1: name and organization share what the fixed columns leave, so the table fits the card
        size: -1,
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
        size: -1,
        header: t('ApiTokens.Column.Organization'),
        cell: ({ row }) => (
          <span className="truncate">{row.original.organization_name}</span>
        ),
      },
      {
        id: 'scope',
        accessorKey: 'scope',
        size: 130,
        header: t('ApiTokens.Column.Scope'),
        cell: ({ row }) => t(`ApiTokens.Scope.${row.original.scope}`),
      },
      {
        id: 'status',
        size: 110,
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
        size: 130,
        header: t('ApiTokens.Column.Expires'),
        cell: ({ row }) => formatDate(row.original.expires_at, 'DATE_MEDIUM'),
      },
      {
        id: 'last_used_at',
        accessorKey: 'last_used_at',
        size: 130,
        header: t('ApiTokens.Column.LastUsed'),
        cell: ({ row }) =>
          formatDate(row.original.last_used_at, 'DATE_MEDIUM') ??
          t('ApiTokens.NeverUsed'),
      },
      {
        id: 'actions',
        size: 110,
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
      </CardHeader>
      <CardDescription clamp={0}>
        {t('ApiTokens.Description')}
      </CardDescription>
      <CardContent clamp={0}>
        {!isLoading && tokens.length === 0 ? (
          <p className="text-default-secondary">{t('ApiTokens.Empty')}</p>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={visibleTokens}
              isLoading={isLoading}
              {...getDataTableLabels(t)}
              onResetTable={() => setFilters(DEFAULT_API_TOKEN_FILTERS)}
              toolbar={
                <DataTableToolbar
                  search={
                    <SearchField
                      fullWidth
                      aria-label={t('ApiTokens.Toolbar.Search')}
                      placeholder={t('ApiTokens.Toolbar.Search')}
                      clearLabel={t('DesignSystem.SearchField.Clear')}
                      value={filters.search}
                      onChange={(event) =>
                        setFilter('search')(event.target.value)
                      }
                      onClear={() => setFilter('search')('')}
                    />
                  }
                  filters={
                    <>
                      <SelectField
                        hideLabel
                        label={t('ApiTokens.Column.Organization')}
                        analyticsId="account_api_token_organization_filter"
                        options={[
                          {
                            value: API_TOKEN_FILTER_ALL,
                            label: t('ApiTokens.Toolbar.AllOrganizations'),
                          },
                          ...organizations.map((organization) => ({
                            value: organization.id,
                            label: organization.name,
                          })),
                        ]}
                        value={filters.organizationId}
                        onValueChange={setFilter('organizationId')}
                      />
                      <SelectField
                        hideLabel
                        label={t('ApiTokens.Column.Scope')}
                        analyticsId="account_api_token_scope_filter"
                        options={[
                          {
                            value: API_TOKEN_FILTER_ALL,
                            label: t('ApiTokens.Toolbar.AllScopes'),
                          },
                          ...API_TOKEN_SCOPES.map((scope) => ({
                            value: scope,
                            label: t(`ApiTokens.Scope.${scope}`),
                          })),
                        ]}
                        value={filters.scope}
                        onValueChange={setFilter('scope')}
                      />
                      <SelectField
                        hideLabel
                        label={t('ApiTokens.Column.Status')}
                        analyticsId="account_api_token_status_filter"
                        options={[
                          {
                            value: API_TOKEN_FILTER_ALL,
                            label: t('ApiTokens.Toolbar.AllStatuses'),
                          },
                          ...API_TOKEN_STATUSES.map((status) => ({
                            value: status,
                            label: t(`ApiTokens.Status.${status}`),
                          })),
                        ]}
                        value={filters.status}
                        onValueChange={setFilter('status')}
                      />
                    </>
                  }
                  actions={
                    <>
                      <span
                        className="text-sm text-default-secondary"
                        aria-live="polite">
                        {t('ApiTokens.Toolbar.Total', {
                          count: visibleTokens.length,
                        })}
                      </span>
                      <DataTableHeadBarOptions />
                    </>
                  }
                />
              }
              tableState={{
                columnPinning: { right: ['actions'] },
              }}
            />
            {!isLoading && visibleTokens.length === 0 && (
              <p className="mt-4 text-center text-sm text-default-secondary">
                {t('ApiTokens.Toolbar.NoMatch')}
              </p>
            )}
          </>
        )}
      </CardContent>
      <CreateApiTokenDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
      />
    </Card>
  );
};
