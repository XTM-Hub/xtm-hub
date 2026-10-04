import { useIsFeatureEnabled } from '@/hooks/use-is-feature-enabled';
import testRender from '@/utils/test/test-render';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { IntegrationType } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ShareableResourceCard from './ShareableResourceCard';

const saveMock = vi.fn();

vi.mock('@/hooks/use-scroll-position', () => ({
  __esModule: true,
  default: () => ({ save: saveMock }),
}));

describe('ShareableResourceCard', () => {
  const serviceInstance = { id: 'service-id' };

  it('renders connector card with document name and description', () => {
    vi.mocked(useIsFeatureEnabled).mockReturnValue(true);

    testRender(
      <ShareableResourceCard
        document={
          {
            id: 'doc-1',
            name: 'My Connector',
            type: 'opencti_integration',
            short_description: 'A connector description',
            integration_type: IntegrationType.Connector,
            use_cases: [],
          } as documentItem_fragment$data
        }
        detailUrl="/details"
        shareLinkUrl="/share"
        serviceInstance={serviceInstance}
      />
    );

    expect(screen.getByText('My Connector')).toBeInTheDocument();
    expect(screen.getByText('A connector description')).toBeInTheDocument();
    expect(
      screen.queryByText(/Service\.OpenctiIntegrations\.ConnectorType/)
    ).not.toBeInTheDocument();
  });

  it('shows the connector type of a connector card', () => {
    vi.mocked(useIsFeatureEnabled).mockReturnValue(true);

    testRender(
      <ShareableResourceCard
        document={
          {
            __typename: 'Connector',
            id: 'doc-3',
            name: 'Splunk Hunt',
            type: 'opencti_integration',
            short_description: 'Runs OpenCTI hunts on Splunk',
            integration_type: IntegrationType.Connector,
            connector_type: 'INTERNAL_HUNT',
            use_cases: [],
          } as unknown as documentItem_fragment$data
        }
        detailUrl="/details"
        shareLinkUrl="/share"
        serviceInstance={serviceInstance}
      />
    );

    expect(
      screen.getByText(
        'Service.OpenctiIntegrations.ConnectorType.INTERNAL_HUNT'
      )
    ).toBeInTheDocument();
  });

  it('renders non-connector card and applies the correct height class', async () => {
    vi.mocked(useIsFeatureEnabled).mockReturnValue(false);
    const { container, user } = testRender(
      <ShareableResourceCard
        document={
          {
            id: 'doc-2',
            name: 'Third party',
            type: 'opencti_integration',
            short_description: 'A third-party description',
            integration_type: IntegrationType.ThirdPartyIntegration,
          } as documentItem_fragment$data
        }
        detailUrl="/details"
        shareLinkUrl="/share"
        serviceInstance={serviceInstance}
      />
    );

    expect(screen.getByText('Third party')).toBeInTheDocument();
    expect(screen.getByText('A third-party description')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('h-[300px]');
    expect(container.firstChild).toHaveClass('sm:h-[348px]');

    await user.click(screen.getByRole('link'));
    expect(saveMock).toHaveBeenCalledTimes(1);
  });
});
