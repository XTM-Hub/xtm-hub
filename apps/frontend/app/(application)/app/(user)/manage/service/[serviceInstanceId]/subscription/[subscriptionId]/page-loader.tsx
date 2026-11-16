'use client';

import Loader from '@/components/Loader';
import { UserServiceFromSubscription } from '@/components/service/user_service.graphql';
import SubscriptionSlug from '@/components/subcription/[slug]/SubscriptionSlug';
import useMountingLoader from '@/hooks/use-mounting-loader';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { userServiceFromSubscriptionQuery } from '@generated/userServiceFromSubscriptionQuery.graphql';
import { useQueryLoader } from 'react-relay';
import { useLocalStorage } from 'usehooks-ts';

// Component interface
interface PreloaderProps {
  subscriptionId: string;
  serviceInstance: serviceInstance_fragment$data;
}

// Component
const PageLoader = ({ subscriptionId, serviceInstance }: PreloaderProps) => {
  const [queryRef, loadQuery] =
    useQueryLoader<userServiceFromSubscriptionQuery>(
      UserServiceFromSubscription
    );
  const [count] = useLocalStorage('countUserServices', 50);
  const [orderMode] = useLocalStorage('orderModeUserServices', 'asc');
  const [orderBy] = useLocalStorage('orderByUserServices', 'first_name');
  useMountingLoader(loadQuery, {
    subscriptionId,
    count,
    orderBy,
    orderMode,
  });

  return (
    <>
      {queryRef && serviceInstance ? (
        <SubscriptionSlug
          queryRef={queryRef}
          serviceInstance={serviceInstance}
          subscriptionId={subscriptionId}
        />
      ) : (
        <Loader />
      )}
    </>
  );
};

// Component export
export default PageLoader;
