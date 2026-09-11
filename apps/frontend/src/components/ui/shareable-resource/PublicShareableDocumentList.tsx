import {
  DocumentNameCell,
  DocumentShortDescriptionCell,
} from '@/components/service/components/DocumentListCells';
import { buildMetadataColumns } from '@/components/service/components/DocumentListColumns';
import { ServiceListDisplayMode } from '@/components/service/components/header/ServiceListHeader';
import BadgeOverflowCounter from '@/components/ui/BadgeOverflowCounter';
import { ShareLinkButton } from '@/components/ui/share-link/ShareLinkButton';
import ShareableResourceCard from '@/components/ui/shareable-resource/ShareableResourceCard';
import useScrollPosition from '@/hooks/use-scroll-position';
import { PUBLIC_CYBERSECURITY_SOLUTIONS_PATH } from '@/utils/path/constant';
import { DataTable } from '@filigran/ui';
import { publicDocumentListItemFragment$data } from '@generated/publicDocumentListItemFragment.graphql';
import { seoServiceInstanceFragment$data } from '@generated/seoServiceInstanceFragment.graphql';
import { ColumnDef } from '@tanstack/react-table';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

interface PublicShareableDocumentListProps {
  documents: publicDocumentListItemFragment$data[];
  serviceInstance: seoServiceInstanceFragment$data;
  baseUrl: string;
  displayMode: ServiceListDisplayMode;
}

export const PublicShareableDocumentList = ({
  documents,
  serviceInstance,
  baseUrl,
  displayMode,
}: PublicShareableDocumentListProps) => {
  const locale = useLocale();
  const { save } = useScrollPosition();
  const t = useTranslations();
  const router = useRouter();

  const columns: ColumnDef<publicDocumentListItemFragment$data>[] = useMemo(
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
              badges={document.use_cases ?? []}
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
        cell: ({ row }) => (
          <div onClick={(event) => event.stopPropagation()}>
            <ShareLinkButton
              documentId={row.original.id}
              url={`${baseUrl}/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${serviceInstance.slug}/${row.original.slug}`}
            />
          </div>
        ),
      },
    ],
    [baseUrl, serviceInstance.slug, t]
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
            <ShareableResourceCard
              publicPath
              key={document.id}
              document={document}
              serviceInstance={serviceInstance}
              detailUrl={`/${locale}/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${serviceInstance.slug}/${document.slug}`}
              shareLinkUrl={`${baseUrl}/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${serviceInstance.slug}/${document.slug}`}
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
              `/${locale}/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${serviceInstance.slug}/${row.original.slug}`
            );
          }}
        />
      )}
    </>
  );
};
