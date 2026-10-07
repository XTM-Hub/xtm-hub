import testRender from '@/utils/test/test-render';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShareableResourceCardHeader } from './ShareableResourceCardHeader';

const SHORT_NAME = 'Short name';
const LONG_NAME = 'A connector name that runs well past thirty characters';
const USE_CASE = 'Threat detection';
const ENTITY_TYPE = 'Malware';

const buildDocument = (name: string) =>
  ({
    name,
    use_cases: [{ id: 'uc-1', name: USE_CASE }],
    entity_types: [ENTITY_TYPE],
  }) as unknown as documentItem_fragment$data;

const renderHeader = (name: string, isConnector: boolean) =>
  testRender(
    <ShareableResourceCardHeader
      document={buildDocument(name)}
      serviceInstanceId="svc-id"
      isConnector={isConnector}
    />
  );

describe('ShareableResourceCardHeader', () => {
  it.each`
    description       | name          | expectsLargeTitle
    ${'a short name'} | ${SHORT_NAME} | ${true}
    ${'a long name'}  | ${LONG_NAME}  | ${false}
  `(
    'renders $description and sizes the title accordingly',
    ({
      name,
      expectsLargeTitle,
    }: {
      name: string;
      expectsLargeTitle: boolean;
    }) => {
      const { container } = renderHeader(name, true);

      expect(screen.getByText(name)).toBeInTheDocument();
      if (expectsLargeTitle) {
        expect(container.querySelector('h2')).toHaveClass('md:text-lg');
      } else {
        expect(container.querySelector('h2')).not.toHaveClass('md:text-lg');
      }
    }
  );

  it.each`
    description          | isConnector
    ${'a connector'}     | ${true}
    ${'a non-connector'} | ${false}
  `(
    'renders the use cases and no entity types for $description',
    ({ isConnector }: { isConnector: boolean }) => {
      renderHeader(SHORT_NAME, isConnector);

      expect(screen.getByText(USE_CASE)).toBeInTheDocument();
      expect(screen.queryByText(ENTITY_TYPE)).not.toBeInTheDocument();
    }
  );
});
