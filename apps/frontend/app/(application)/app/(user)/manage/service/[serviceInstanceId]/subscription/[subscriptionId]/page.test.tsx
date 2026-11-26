import { fetchServiceInstanceById } from '@/components/service/service-instance.server';
import testRender from '@/utils/test/test-render';
import {
  ServiceDefinitionIdentifier,
  type ServiceInstanceItemFragment,
} from '@graphql/generated';
import { screen } from '@testing-library/react';
import { notFound } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './page';

vi.mock('@/components/service/service-instance.server', () => ({
  fetchServiceInstanceById: vi.fn(),
}));

// The subscription page fetches its users: it is not under test.
vi.mock('@/components/subcription/[slug]/SubscriptionSlug', () => ({
  default: ({
    subscriptionId,
    serviceInstance,
  }: {
    subscriptionId: string;
    serviceInstance?: ServiceInstanceItemFragment;
  }) => (
    <div>
      subscription-{subscriptionId}-{serviceInstance?.name}
    </div>
  ),
}));

const NOT_FOUND_ERROR = new Error('NEXT_NOT_FOUND');
const SERVICE_NAME = 'Custom dashboards';
const SERVICE_INSTANCE: ServiceInstanceItemFragment = {
  id: 'service instance 1',
  name: SERVICE_NAME,
  description: null,
  slug: null,
  capabilities: [],
  service_definition: {
    identifier: ServiceDefinitionIdentifier.OpenctiCustomDashboards,
  },
};

const renderPage = async () =>
  testRender(
    await Page({
      params: Promise.resolve({
        serviceInstanceId: 'service%20instance%201',
        subscriptionId: 'subscription%201',
      }),
    })
  );

describe('Manage service subscription page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show the users of the decoded subscription under its service instance', async () => {
    // Given
    vi.mocked(fetchServiceInstanceById).mockResolvedValue(SERVICE_INSTANCE);

    // When
    await renderPage();

    // Then
    expect(fetchServiceInstanceById).toHaveBeenCalledWith('service instance 1');
    expect(
      screen.getByText(`subscription-subscription 1-${SERVICE_NAME}`)
    ).toBeInTheDocument();
  });

  it('should lead to the not found page when the service instance cannot be read', async () => {
    // Given
    vi.mocked(fetchServiceInstanceById).mockResolvedValue(null);
    // Next.js' notFound never returns: it throws to interrupt the render.
    vi.mocked(notFound).mockImplementationOnce(() => {
      throw NOT_FOUND_ERROR;
    });

    // When
    const result = renderPage();

    // Then
    await expect(result).rejects.toBe(NOT_FOUND_ERROR);
  });
});
