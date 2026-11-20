import testRender from '@/utils/test/test-render';
import type { ServiceInstanceItemFragment } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PageLoader from './page-loader';

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

const SUBSCRIPTION_ID = 'subscription-1';

describe('Admin service subscription PageLoader', () => {
  it('should show the users of the subscription without a service instance of its own', () => {
    // When
    testRender(<PageLoader id={SUBSCRIPTION_ID} />);

    // Then
    expect(
      screen.getByText(`subscription-${SUBSCRIPTION_ID}-admin`)
    ).toBeInTheDocument();
  });
});
