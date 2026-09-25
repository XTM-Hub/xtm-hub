'use client';

import AddVotableFeature from '@/components/admin/voting-round/AddVotableFeature';
import EditVotableFeature from '@/components/admin/voting-round/EditVotableFeature';
import { VotableFeatureFormModel } from '@/components/admin/voting-round/VotableFeatureForm';
import { VotingRoundResults } from '@/components/admin/voting-round/VotingRoundResults';
import { VotingRoundStatusActions } from '@/components/admin/voting-round/VotingRoundStatusActions';
import { VotingRoundStatusBadge } from '@/components/admin/voting-round/VotingRoundStatusBadge';
import { useExecuteAfterAnimation } from '@/hooks/use-execute-after-animation';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { i18nKey } from '@/utils/datatable';
import { Badge, DataTable, Skeleton } from '@filigran/ui';
import {
  useVotingRoundDetailQuery,
  VotableFeatureAdminRowFragment,
  VotingRoundStatus,
} from '@graphql/generated';
import { votingRoundKeys } from '@graphql/voting-round/voting-round.keys';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

export const VotingRoundDetail = ({ roundId }: { roundId: string }) => {
  const t = useTranslate();
  const [featureToEdit, setFeatureToEdit] = useState<
    VotableFeatureFormModel | undefined
  >(undefined);

  const variables = { id: roundId };
  const { data, isLoading } = useVotingRoundDetailQuery(
    portalGraphqlClient,
    variables,
    { queryKey: votingRoundKeys.detail(variables) }
  );

  const round = data?.votingRound;
  const features = useMemo<VotableFeatureAdminRowFragment[]>(
    () => round?.features ?? [],
    [round]
  );

  const columns: ColumnDef<VotableFeatureAdminRowFragment>[] = [
    {
      accessorKey: 'position',
      id: 'position',
      header: t('VotingRound.Feature.Position'),
      cell: ({ row }) => row.original.position,
    },
    {
      accessorKey: 'product',
      id: 'product',
      header: t('VotingRound.Feature.Product'),
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.product.toUpperCase()}</Badge>
      ),
    },
    {
      accessorKey: 'title',
      id: 'title',
      header: t('VotingRound.Feature.Title'),
      cell: ({ row }) => <span className="truncate">{row.original.title}</span>,
    },
    {
      id: 'use_cases',
      header: t('Service.Form.UseCasesLabel'),
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-xs">
          {row.original.use_cases.map((useCase) => (
            <Badge
              key={useCase.id}
              variant="outline">
              {useCase.name}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'active',
      id: 'active',
      header: t('VotingRound.Feature.Active'),
      cell: ({ row }) =>
        row.original.active
          ? t('VotingRound.Feature.ActiveYes')
          : t('VotingRound.Feature.ActiveNo'),
    },
  ];

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!round) {
    return <p className="text-muted-foreground">{t('Utils.NotFound')}</p>;
  }

  return (
    <div className="flex flex-col gap-xl">
      <div className="flex flex-wrap items-center justify-between gap-m">
        <div className="flex flex-col gap-xs">
          <div className="flex items-center gap-s">
            <h1 className="text-2xl font-semibold">{round.name}</h1>
            <VotingRoundStatusBadge status={round.status} />
          </div>
          {round.description && (
            <p className="text-muted-foreground">{round.description}</p>
          )}
        </div>
        <VotingRoundStatusActions
          roundId={round.id}
          roundName={round.name}
          status={round.status}
          hasFeatures={features.some(({ active }) => active)}
        />
      </div>

      <section className="flex flex-col gap-m">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {t('VotingRound.Feature.SectionTitle')}
          </h2>
          {round.status !== VotingRoundStatus.Closed && (
            <AddVotableFeature
              roundId={round.id}
              serviceInstanceId={round.service_instance_id}
            />
          )}
        </div>
        <DataTable
          columns={columns}
          data={features}
          i18nKey={i18nKey(t)}
          onClickRow={({ original }) =>
            setFeatureToEdit({
              id: original.id,
              title: original.title,
              short_description: original.short_description,
              description: original.description,
              product: original.product,
              use_cases: original.use_cases,
              illustration_document_id: original.illustration_document_id,
              position: original.position,
              active: original.active,
            })
          }
        />
      </section>

      <VotingRoundResults roundId={round.id} />

      {featureToEdit && (
        <EditVotableFeature
          feature={featureToEdit}
          serviceInstanceId={round.service_instance_id}
          open={!!featureToEdit}
          onClose={() =>
            useExecuteAfterAnimation(() => setFeatureToEdit(undefined))
          }
        />
      )}
    </div>
  );
};
