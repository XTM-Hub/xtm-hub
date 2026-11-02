import testRender from '@/utils/test/test-render';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { IntegrationType } from '@graphql/generated';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { describe, expect, it } from 'vitest';
import { buildDocumentListColumns } from './DocumentListColumns';

const t = (key: string) => key;
const COMPATIBILITY_LABEL = 'Service.List.Tab.Compatibility';

const buildDocument = (
  overrides: Partial<documentItem_fragment$data>
): documentItem_fragment$data => ({
  ' $fragmentType': 'documentItem_fragment',
  __typename: 'Document',
  id: 'document-1',
  type: 'OPENCTI_INTEGRATION',
  active: true,
  name: null,
  slug: null,
  description: null,
  short_description: null,
  file_name: null,
  created_at: null,
  updated_at: null,
  download_number: null,
  share_number: null,
  children_documents: null,
  service_instance: null,
  subscription: null,
  uploader: null,
  uploader_organization: null,
  use_cases: null,
  ...overrides,
});

const CONNECTOR = buildDocument({
  integration_type: IntegrationType.Connector,
  manager_supported: true,
  product_version: '6.8.0',
});
const CSV_FEED = buildDocument({
  integration_type: IntegrationType.CsvFeed,
  product_version: '6.1.0',
});

const useDocumentListTable = (documents: documentItem_fragment$data[]) =>
  useReactTable({
    columns: buildDocumentListColumns({
      documents,
      t,
      renderActions: () => null,
    }),
    data: documents,
    getCoreRowModel: getCoreRowModel(),
  });

const ColumnCell = ({
  columnId,
  document,
}: {
  columnId: string;
  document: documentItem_fragment$data;
}) => {
  const table = useDocumentListTable([CONNECTOR, CSV_FEED]);
  const cell = table
    .getRowModel()
    .rows.find((row) => row.original === document)
    ?.getAllCells()
    .find((rowCell) => rowCell.column.id === columnId);
  if (!cell) {
    throw new Error(`column ${columnId} has no cell for this document`);
  }
  return flexRender(cell.column.columnDef.cell, cell.getContext());
};

const ColumnHeader = ({ columnId }: { columnId: string }) => {
  const table = useDocumentListTable([CONNECTOR]);
  const header = table.getFlatHeaders().find(({ id }) => id === columnId);
  if (!header) {
    throw new Error(`column ${columnId} has no header`);
  }
  return flexRender(header.column.columnDef.header, header.getContext());
};

const renderCell = (columnId: string, document: documentItem_fragment$data) =>
  testRender(
    <ColumnCell
      columnId={columnId}
      document={document}
    />
  );

describe('buildDocumentListColumns', () => {
  it.each([
    {
      context: 'the list holds connectors',
      documents: [CONNECTOR],
      expectedColumnIds: [
        'name',
        'feature',
        'short_description',
        'type',
        'use_cases',
        'compatibility',
        'action',
      ],
    },
    {
      context: 'the list holds no connector',
      documents: [CSV_FEED],
      expectedColumnIds: [
        'name',
        'short_description',
        'type',
        'use_cases',
        'action',
      ],
    },
    {
      context: 'a connector follows other resources',
      documents: [CSV_FEED, CONNECTOR],
      expectedColumnIds: [
        'name',
        'feature',
        'short_description',
        'type',
        'use_cases',
        'compatibility',
        'action',
      ],
    },
  ])(
    'should build the matching columns when $context',
    ({ documents, expectedColumnIds }) => {
      // Given / When
      const columns = buildDocumentListColumns({
        documents,
        t,
        renderActions: () => null,
      });

      // Then
      expect(columns.map((column) => column.id)).toEqual(expectedColumnIds);
    }
  );

  it.each(['feature', 'compatibility'])(
    'should fill the %s cell when the row is a connector',
    (columnId) => {
      // Given / When
      const { container } = renderCell(columnId, CONNECTOR);

      // Then
      expect(container).not.toBeEmptyDOMElement();
    }
  );

  it('should keep the full compatibility label as a tooltip on its header when the list holds connectors', () => {
    // Given / When
    const { getByText } = testRender(<ColumnHeader columnId="compatibility" />);

    // Then
    expect(getByText(COMPATIBILITY_LABEL)).toHaveAttribute(
      'title',
      COMPATIBILITY_LABEL
    );
  });

  it.each(['feature', 'compatibility'])(
    'should leave the %s cell empty when the row is not a connector',
    (columnId) => {
      // Given / When
      const { container } = renderCell(columnId, CSV_FEED);

      // Then
      expect(container).toBeEmptyDOMElement();
    }
  );
});
