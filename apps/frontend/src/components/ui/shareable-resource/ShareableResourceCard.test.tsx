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
    expect(container.firstChild).toHaveClass('h-[310px]');

    await user.click(screen.getByRole('link'));
    expect(saveMock).toHaveBeenCalledTimes(1);
  });
});
