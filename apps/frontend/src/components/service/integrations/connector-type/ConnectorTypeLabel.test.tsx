import { ConnectorTypeLabel } from '@/components/service/integrations/connector-type/ConnectorTypeLabel';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('ConnectorTypeLabel', () => {
  it('renders the translated label of a known connector type with a decorative icon', () => {
    const { container } = testRender(
      <ConnectorTypeLabel connectorType="INTERNAL_HUNT" />
    );

    expect(
      screen.getByText(
        'Service.OpenctiIntegrations.ConnectorType.INTERNAL_HUNT'
      )
    ).toBeInTheDocument();
    expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });

  it('renders a readable label for a connector type unknown to this build', () => {
    testRender(<ConnectorTypeLabel connectorType="INTERNAL_INGESTION" />);

    expect(screen.getByText('Internal ingestion')).toBeInTheDocument();
  });
});
