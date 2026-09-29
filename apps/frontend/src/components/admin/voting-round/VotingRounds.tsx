'use client';

import AddVotingRound from '@/components/admin/voting-round/AddVotingRound';
import EditVotingRound from '@/components/admin/voting-round/EditVotingRound';
import { useRoadmapServiceInstances } from '@/components/admin/voting-round/use-roadmap-service-instances';
import { VotingRoundStatusBadge } from '@/components/admin/voting-round/VotingRoundStatusBadge';
import { IconActions, IconActionsItem } from '@/components/ui/IconActions';
import { useExecuteAfterAnimation } from '@/hooks/use-execute-after-animation';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { i18nKey } from '@/utils/datatable';
import { APP_PATH } from '@/utils/path/constant';
import { MoreVertIcon } from '@filigran/icon';
import { DataTable, DataTableHeadBarOptions } from '@filigran/ui';
import {
  useVotingRoundsListQuery,
  VotingRoundRowFragment,
  VotingRoundsListQuery,
} from '@graphql/generated';
import { votingRoundKeys } from '@graphql/voting-round/voting-round.keys';
import { ColumnDef } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

type VotingRoundListRow = VotingRoundsListQuery['votingRounds'][number];

const VotingRounds = () => {
  const t = useTranslate();
  const router = useRouter();
  const [roundToEdit, setRoundToEdit] = useState<
    VotingRoundRowFragment | undefined
  >(undefined);

  const { data: queryData, isLoading } = useVotingRoundsListQuery(
    portalGraphqlClient,
    {},
    { queryKey: votingRoundKeys.list() }
  );

  const rounds = useMemo<VotingRoundListRow[]>(
    () => queryData?.votingRounds ?? [],
    [queryData]
  );

  const serviceInstances = useRoadmapServiceInstances();
  const serviceInstanceNames = useMemo(
    () => new Map(serviceInstances.map(({ id, name }) => [id, name])),
    [serviceInstances]
  );

  const columns: ColumnDef<VotingRoundListRow>[] = [
    {
      accessorKey: 'name',
      id: 'name',
      header: t('VotingRound.ListPage.Name'),
      cell: ({ row }) => <span className="truncate">{row.original.name}</span>,
    },
    {
      id: 'service_instance',
      header: t('VotingRound.ListPage.ServiceInstance'),
      enableSorting: false,
      cell: ({ row }) =>
        serviceInstanceNames.get(row.original.service_instance_id) ??
        row.original.service_instance_id,
    },
    {
      accessorKey: 'status',
      id: 'status',
      header: t('VotingRound.ListPage.Status'),
      cell: ({ row }) => (
        <VotingRoundStatusBadge status={row.original.status} />
      ),
    },
    {
      id: 'features',
      header: t('VotingRound.ListPage.FeatureCount'),
      enableSorting: false,
      cell: ({ row }) => row.original.feature_count,
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <div
          className="flex items-center justify-end"
          onClick={(event) => event.stopPropagation()}>
          <IconActions
            icon={
              <>
                <MoreVertIcon className="h-4 w-4 text-primary" />
                <span className="sr-only">{t('Utils.OpenMenu')}</span>
              </>
            }>
            <IconActionsItem onClick={() => setRoundToEdit(row.original)}>
              {t('VotingRound.Actions.Edit')}
            </IconActionsItem>
          </IconActions>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="mb-s flex justify-end">
        <AddVotingRound
          copySources={rounds.map(({ id, name }) => ({ id, name }))}
        />
      </div>
      <DataTable
        columns={columns}
        data={rounds}
        isLoading={isLoading}
        i18nKey={i18nKey(t)}
        tableState={{ columnPinning: { right: ['actions'] } }}
        onClickRow={({ original }) =>
          router.push(`/${APP_PATH}/admin/voting-rounds/${original.id}`)
        }
        toolbar={
          <div className="flex items-center justify-end gap-s">
            <DataTableHeadBarOptions />
          </div>
        }
      />
      {roundToEdit && (
        <EditVotingRound
          votingRound={roundToEdit}
          open={!!roundToEdit}
          onClose={() =>
            useExecuteAfterAnimation(() => setRoundToEdit(undefined))
          }
        />
      )}
    </>
  );
};

export default VotingRounds;
