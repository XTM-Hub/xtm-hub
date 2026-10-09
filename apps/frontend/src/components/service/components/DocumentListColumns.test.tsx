import testRender from '@/utils/test/test-render';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { IntegrationType } from '@graphql/generated';
import { CellContext } from '@tanstack/react-table';
import { describe, expect, it } from 'vitest';
import { buildDocumentListColumns } from './DocumentListColumns';

const t = (key: string) => key;
const CONNECTOR = {
  active: true,
  integration_type: IntegrationType.Connector,
  manager_supported: true,
  product_version: '6.8.0',
} as unknown as documentItem_fragment$data;
const CSV_FEED = {
  integration_type: IntegrationType.CsvFeed,
  product_version: '6.1.0',
} as unknown as documentItem_fragment$data;

const renderCell = (columnId: string, document: documentItem_fragment$data) => {
  const cell = buildDocumentListColumns({
    documents: [CONNECTOR, CSV_FEED],
    t,
    renderActions: () => null,
  }).find((column) => column.id === columnId)?.cell;
  if (typeof cell !== 'function') {
    throw new Error(`column ${columnId} has no cell`);
  }
  return testRender(
    <>
      {cell({ row: { original: document } } as CellContext<
        documentItem_fragment$data,
        unknown
      >)}
    </>
  );
};

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
