import ServiceSlug from '@/components/service/[slug]/ServiceSlug';
import testRender from '@/utils/test/test-render';
import type {
  ServiceInstanceWithCapabilitiesItemFragment,
  SubscriptionItemFragment,
} from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/data-table', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui/data-table')>()),
  DataTable: ({ data }: { data: SubscriptionItemFragment[] }) => (
    <ul>
      {data.map((subscription) => (
        <li key={subscription.id}>{subscription.organization.name}</li>
      ))}
    </ul>
  ),
}));

const SERVICE_NAME = 'OpenCTI Library';
const CAPABILITY_NAME = 'upload';
const ORGANIZATION_NAME = 'Acme Corporation';

const SERVICE_INSTANCE: ServiceInstanceWithCapabilitiesItemFragment = {
  id: 'service-instance-1',
  name: SERVICE_NAME,
  description: null,
  tags: null,
  service_definition: {
    service_capability: [
      { id: 'capability-1', name: CAPABILITY_NAME, description: null },
    ],
  },
};

const SUBSCRIPTION: SubscriptionItemFragment = {
  id: 'subscription-1',
  organization: {
    id: 'organization-1',
    name: ORGANIZATION_NAME,
    personal_space: false,
  },
  service_instance: { id: SERVICE_INSTANCE.id, name: SERVICE_NAME },
  subscription_capability: [],
  start_date: null,
  end_date: null,
};

describe('ServiceSlug', () => {
  it('should head the page with the loaded service instance', () => {
    // When
    testRender(
      <ServiceSlug
        subscriptions={[SUBSCRIPTION]}
        serviceInstance={SERVICE_INSTANCE}
      />
    );

    // Then
    expect(
      screen.getByRole('heading', { name: SERVICE_NAME })
    ).toBeInTheDocument();
  });

  it('should list the subscribed organizations of the service', () => {
    // When
    testRender(
      <ServiceSlug
        subscriptions={[SUBSCRIPTION]}
        serviceInstance={SERVICE_INSTANCE}
      />
    );

    // Then
    expect(screen.getByText(ORGANIZATION_NAME)).toBeInTheDocument();
  });
});
