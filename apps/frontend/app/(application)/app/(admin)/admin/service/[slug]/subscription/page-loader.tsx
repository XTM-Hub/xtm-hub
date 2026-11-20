'use client';

import SubscriptionSlug from '@/components/subcription/[slug]/SubscriptionSlug';

// Component interface
interface PreloaderProps {
  id: string;
}

// Component
const PageLoader = ({ id }: PreloaderProps) => (
  <SubscriptionSlug subscriptionId={id} />
);

// Component export
export default PageLoader;
