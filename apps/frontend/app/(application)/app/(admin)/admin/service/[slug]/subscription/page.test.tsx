import testRender from '@/utils/test/test-render';
import {
  PortalCapability,
  type ServiceInstanceItemFragment,
} from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Page from './page';

vi.mock('@/components/subcription/[slug]/SubscriptionSlug', () => ({
  default: ({
    subscriptionId,
    serviceInstance,
  }: {
    subscriptionId: string;
    serviceInstance?: ServiceInstanceItemFragment;
  }) => (
    <div>
      subscription-{subscriptionId}-{serviceInstance?.name ?? 'admin'}
    </div>
  ),
}));

const SUBSCRIPTION_TEXT = 'subscription-my-slug-admin';

const ADMIN_USER = { capabilities: [{ name: PortalCapability.Bypass }] };
const STANDARD_USER = { capabilities: [] };
const renderPage = async () =>
  await Page({ params: Promise.resolve({ slug: 'my-slug' }) });

describe('Admin service subscription page', () => {
  it('should show an administrator the users of the subscription without a service instance of its own', async () => {
    // Given
    const page = await renderPage();

    // When
    testRender(page, { me: ADMIN_USER });

    // Then
    expect(screen.getByText(SUBSCRIPTION_TEXT)).toBeInTheDocument();
  });

  it('should tell a standard user that they are not authorized instead of showing the page', async () => {
    // Given
    const page = await renderPage();

    // When
    testRender(page, { me: STANDARD_USER });

    // Then
    expect(screen.getByText('Error.YouAreNotAuthorized')).toBeInTheDocument();
    expect(screen.queryByText(SUBSCRIPTION_TEXT)).not.toBeInTheDocument();
  });
});
