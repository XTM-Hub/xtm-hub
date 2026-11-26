'use client';

import SubscriptionSlug from '@/components/subcription/[slug]/SubscriptionSlug';
import { ServiceInstanceItemFragment } from '@graphql/generated';

// Component interface
interface PreloaderProps {
  subscriptionId: string;
  serviceInstance: ServiceInstanceItemFragment;
}

// Component
const PageLoader = ({ subscriptionId, serviceInstance }: PreloaderProps) => (
  <SubscriptionSlug
    serviceInstance={serviceInstance}
    subscriptionId={subscriptionId}
  />
);

// Component export
export default PageLoader;
