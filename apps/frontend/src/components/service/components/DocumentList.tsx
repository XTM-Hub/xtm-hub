'use client';

import { DocumentActionsCell } from '@/components/service/components/DocumentActionsCell';
import {
  DocumentNameCell,
  DocumentShortDescriptionCell,
} from '@/components/service/components/DocumentListCells';
import { buildMetadataColumns } from '@/components/service/components/DocumentListColumns';
import { ServiceListDisplayMode } from '@/components/service/components/header/ServiceListHeader';
import ServiceCard from '@/components/service/components/ServiceCard';
import { useServiceContext } from '@/components/service/components/ServiceContext';
import { SettingsContext } from '@/components/settings/EnvPortalContext';
import {
  APP_PATH,
  PUBLIC_CYBERSECURITY_SOLUTIONS_PATH,
} from '@/utils/path/constant';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { useContext, useMemo } from 'react';

import BadgeOverflowCounter, {
  BadgeOverflow,
} from '@/components/ui/BadgeOverflowCounter';
import useScrollPosition from '@/hooks/use-scroll-position';
import { DataTable } from '@filigran/ui';
import { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

interface DocumentListProps {
  documents: documentItem_fragment$data[];
  displayMode: ServiceListDisplayMode;
  connectionId?: string;
}

const DocumentList = ({
  documents,
  displayMode,
  connectionId,
}: DocumentListProps) => {
  const { settings } = useContext(SettingsContext);
  const { serviceInstance } = useServiceContext();
  const t = useTranslations();
  const router = useRouter();
  const { save } = useScrollPosition();
  const columns: ColumnDef<documentItem_fragment$data>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        id: 'name',
        header: t('Service.List.Tab.Name'),
        cell: ({ row }) => <DocumentNameCell document={row.original} />,
      },
      {
        accessorKey: 'short_description',
        id: 'short_description',
        header: t('Service.List.Tab.Description'),
        cell: ({ row }) => (
          <DocumentShortDescriptionCell document={row.original} />
        ),
      },
      {
        accessorKey: 'use_cases',
        id: 'use_cases',
        header: t('Service.List.Tab.UseCases'),
        cell: ({ row }) => {
          const document = row.original;

          return (
            <BadgeOverflowCounter
              formatLabel={false}
              badges={document.use_cases as BadgeOverflow[]}
              className="z-2 shrink-0"
            />
          );
        },
      },
      {
        accessorKey: 'action',
        id: 'action',
        enableHiding: false,
        enableSorting: false,
        header: t('Service.List.Tab.Actions'),
        cell: ({ row }) => <DocumentActionsCell document={row.original} />,
      },
    ],
    [t]
  );

  const tableColumns = useMemo(
    () =>
      buildMetadataColumns({
        columns,
        documents,
        t,
      }),
    [columns, documents, t]
  );

  return (
    <>
      {displayMode === ServiceListDisplayMode.Tab ? (
        <ul
          className={
            'grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-l'
          }>
          {documents.map((document) => (
            <ServiceCard
              key={document.id}
              document={document}
              connectionId={connectionId}
              detailUrl={`/${APP_PATH}/service/${serviceInstance.service_definition?.identifier}/${serviceInstance.id}/${document.id}`}
              shareLinkUrl={`${settings!.base_url_front}/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${serviceInstance.slug}/${document.slug}`}
            />
          ))}
        </ul>
      ) : (
        <DataTable
          columns={tableColumns}
          data={documents}
          toolbar={<></>}
          onClickRow={(row) => {
            save();
            router.push(
              `/${APP_PATH}/service/${serviceInstance.service_definition?.identifier}/${serviceInstance.id}/${row.original.id}`
            );
          }}
        />
      )}
    </>
  );
};

export default DocumentList;
