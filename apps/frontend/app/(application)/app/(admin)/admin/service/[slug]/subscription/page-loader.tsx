'use client';

import Loader from '@/components/Loader';
import { UserServiceFromSubscription } from '@/components/service/user_service.graphql';
import SubscriptionSlug from '@/components/subcription/[slug]/SubscriptionSlug';
import useMountingLoader from '@/hooks/use-mounting-loader';
import { userServiceFromSubscriptionQuery } from '@generated/userServiceFromSubscriptionQuery.graphql';
import { useQueryLoader } from 'react-relay';
import { useLocalStorage } from 'usehooks-ts';

// Component interface
interface PreloaderProps {
  id: string;
}

// Component
const PageLoader = ({ id }: PreloaderProps) => {
  const [queryRef, loadQuery] =
    useQueryLoader<userServiceFromSubscriptionQuery>(
      UserServiceFromSubscription
    );
  const [count] = useLocalStorage('countUserServices', 50);
  const [orderMode] = useLocalStorage('orderModeUserServices', 'asc');
  const [orderBy] = useLocalStorage('orderByUserServices', 'first_name');
  useMountingLoader(loadQuery, {
    subscriptionId: id,
    count,
    orderBy,
    orderMode,
  });

  return (
    <>
      {queryRef ? (
        <SubscriptionSlug
          queryRef={queryRef}
          subscriptionId={id}
        />
      ) : (
        <Loader />
      )}
    </>
  );
};

// Component export
export default PageLoader;
