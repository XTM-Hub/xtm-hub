import testRender from '@/utils/test/test-render';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShareableResourceCardHeader } from './ShareableResourceCardHeader';

const NAME = 'A connector name';
const USE_CASE = 'Threat detection';
const ENTITY_TYPE = 'Malware';

const renderHeader = () =>
  testRender(
    <ShareableResourceCardHeader
      document={
        {
          name: NAME,
          use_cases: [{ id: 'uc-1', name: USE_CASE }],
          entity_types: [ENTITY_TYPE],
        } as unknown as documentItem_fragment$data
      }
      serviceInstanceId="svc-id"
    />
  );

describe('ShareableResourceCardHeader', () => {
  it('should show the name as the card heading when rendering a resource', () => {
    // Given / When
    renderHeader();

    // Then
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(NAME);
  });

  it('renders the use cases and no entity types', () => {
    renderHeader();

    expect(screen.getByText(USE_CASE)).toBeInTheDocument();
    expect(screen.queryByText(ENTITY_TYPE)).not.toBeInTheDocument();
  });
});
