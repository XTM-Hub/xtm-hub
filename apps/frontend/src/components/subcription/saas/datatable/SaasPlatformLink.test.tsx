import { SaasPlatformLink } from '@/components/subcription/saas/datatable/SaasPlatformLink';
import testRender from '@/utils/test/test-render';
import { ServiceDefinitionIdentifier } from '@graphql/generated';
import { screen } from '@testing-library/react';

const SERVICE_INSTANCE_ID = 'service-instance-id';

describe('SaasPlatformLink', () => {
  it('should display the logo and the metrics link of a saas platform registered in the Hub', () => {
    // Given a saas platform registered in the Hub
    // When its link is rendered
    testRender(
      <SaasPlatformLink
        registeredPlatform={{
          identifier: ServiceDefinitionIdentifier.OpenctiRegistration,
          service_instance_id: SERVICE_INSTANCE_ID,
        }}
      />
    );

    // Then it links to the metrics page of its service instance, opened from the CSM board, after the logo of its product
    const link = screen.getByRole('link', { name: 'CSMBoard.ViewMetrics' });
    expect(link).toHaveAttribute(
      'href',
      `/app/service/opencti_registration/${SERVICE_INSTANCE_ID}?from=csm-board`
    );
    expect(link.previousElementSibling?.tagName.toLowerCase()).toBe('svg');
  });
});
