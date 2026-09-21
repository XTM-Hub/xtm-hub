'use client';
import { TrialsTabQuotasPlatformUpdate } from '@/components/trials/tab/quotas/TrialsTabQuotasPlatformUpdate';
import { trialsRegionKey } from '@/components/trials/trials.const';
import { useUserHasPortalCapability } from '@/hooks/use-portal-capability';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { DataTable } from '@filigran/ui';
import { trialsQuotasKeys } from '@graphql/deployment/deployment.keys';
import {
  PortalCapability,
  TrialsQuotaFragment,
  useTrialsQuotasQuery,
} from '@graphql/generated';
import { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

export const TrialsTabQuotasPlatform = () => {
  const t = useTranslations();
  const userHasModifyTrialQuotaCapa = useUserHasPortalCapability([
    PortalCapability.ModifyTrialsQuota,
  ]);
  const [quotaEdit, setQuotaEdit] = useState<TrialsQuotaFragment | undefined>(
    undefined
  );

  const { data } = useTrialsQuotasQuery(portalGraphqlClient, undefined, {
    queryKey: trialsQuotasKeys.list(),
  });

  const columns: ColumnDef<TrialsQuotaFragment>[] = useMemo(
    () => [
      {
        accessorKey: 'region',
        id: 'region',
        header: t('TrialsDashboard.Columns.Region'),
        enableSorting: false,
        cell: ({ row }: { row: { original: TrialsQuotaFragment } }) => {
          return <span>{t(trialsRegionKey(row.original.region))}</span>;
        },
      },
      {
        accessorKey: 'availableCount',
        id: 'available',
        header: t('TrialsDashboard.Columns.Available'),
        enableSorting: false,
      },
      {
        accessorFn: (originalRow) =>
          originalRow.capacity - originalRow.availableCount,
        id: 'taken',
        header: t('TrialsDashboard.Columns.Taken'),
        enableSorting: false,
      },
      {
        accessorKey: 'capacity',
        id: 'total',
        header: t('TrialsDashboard.Columns.Total'),
        enableSorting: false,
      },
    ],
    [t]
  );

  const dataTableData = useMemo(
    () =>
      [...(data?.deploymentRequestsAvailable ?? [])].sort((a, b) =>
        t(trialsRegionKey(a.region)).localeCompare(t(trialsRegionKey(b.region)))
      ),
    [data, t]
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={dataTableData}
        onClickRow={(row) => setQuotaEdit(row.original)}
      />
      {quotaEdit && userHasModifyTrialQuotaCapa && (
        <TrialsTabQuotasPlatformUpdate
          quota={quotaEdit}
          key={quotaEdit.id}
          defaultStateOpen={!!quotaEdit}
          onCloseSheet={() => setQuotaEdit(undefined)}
        />
      )}
    </>
  );
};
