'use client';

import {
  DocumentNameCell,
  DocumentShortDescriptionCell,
} from '@/components/service/components/DocumentListCells';
import BadgeOverflowCounter, {
  BadgeOverflow,
} from '@/components/ui/BadgeOverflowCounter';
import { ConnectorCompatibilityChip } from '@/components/ui/shareable-resource/ConnectorCompatibilityChip';
import { ShareableResourceTypeChip } from '@/components/ui/shareable-resource/ShareableResourceTypeChip';
import { ShareableResourceCardSupportIcons } from '@/components/ui/shareable-resource/card-design/ShareableResourceCardSupportIcons';
import { UseTranslationsProps } from '@/i18n/config';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { publicDocumentListItemFragment$data } from '@generated/publicDocumentListItemFragment.graphql';
import { IntegrationType } from '@graphql/generated';
import { ColumnDef } from '@tanstack/react-table';
import { ReactNode } from 'react';

export const DOCUMENT_LIST_TABLE_CLASS_NAME =
  '[&_th]:bg-transparent [&_th]:content-compact-bold';

type DocumentListItem =
  documentItem_fragment$data | publicDocumentListItemFragment$data;

const isConnector = (document: DocumentListItem) =>
  document.integration_type === IntegrationType.Connector;

export const buildDocumentListColumns = <T extends DocumentListItem>(params: {
  documents: T[];
  t: UseTranslationsProps;
  publicPath?: boolean;
  renderActions: (document: T) => ReactNode;
}): ColumnDef<T>[] => {
  const { documents, t, publicPath = false, renderActions } = params;
  const hasConnectors = documents.some(isConnector);

  const columns: ColumnDef<T>[] = [
    {
      accessorKey: 'name',
      id: 'name',
      size: 140,
      header: t('Service.List.Tab.Name'),
      cell: ({ row }) => <DocumentNameCell document={row.original} />,
    },
  ];

  if (hasConnectors) {
    columns.push({
      id: 'feature',
      size: 70,
      header: t('Service.List.Tab.Feature'),
      cell: ({ row }) =>
        isConnector(row.original) ? (
          <ShareableResourceCardSupportIcons document={row.original} />
        ) : null,
    });
  }

  columns.push(
    {
      accessorKey: 'short_description',
      id: 'short_description',
      size: 140,
      header: t('Service.List.Tab.Description'),
      cell: ({ row }) => (
        <DocumentShortDescriptionCell document={row.original} />
      ),
    },
    {
      id: 'type',
      size: 130,
      header: t('Service.List.Tab.Type'),
      cell: ({ row }) => (
        <ShareableResourceTypeChip
          document={row.original}
          className="max-w-full"
        />
      ),
    },
    {
      accessorKey: 'use_cases',
      id: 'use_cases',
      size: 140,
      header: t('Service.List.Tab.UseCase'),
      cell: ({ row }) => (
        <BadgeOverflowCounter
          variant="chip"
          formatLabel={false}
          badges={(row.original.use_cases ?? []) as BadgeOverflow[]}
          className="z-2 shrink-0"
        />
      ),
    }
  );

  if (hasConnectors) {
    columns.push({
      id: 'compatibility',
      size: 130,
      header: () => (
        <span
          className="block max-w-32 truncate"
          title={t('Service.List.Tab.Compatibility')}>
          {t('Service.List.Tab.Compatibility')}
        </span>
      ),
      cell: ({ row }) =>
        isConnector(row.original) ? (
          <ConnectorCompatibilityChip
            document={row.original}
            publicPath={publicPath}
          />
        ) : null,
    });
  }

  columns.push({
    accessorKey: 'action',
    id: 'action',
    size: 80,
    enableHiding: false,
    enableSorting: false,
    header: t('Service.List.Tab.Action'),
    cell: ({ row }) => renderActions(row.original),
  });

  return columns;
};
