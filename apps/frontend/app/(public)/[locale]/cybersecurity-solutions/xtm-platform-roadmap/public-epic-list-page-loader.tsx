'use client';
import { EpicListQuery } from '@/components/epic/epic.graphql';
import PublicEpicList from '@/components/epic/PublicEpicList';
import { Skeleton } from '@/components/ui/skeleton';
import { epicsQuery } from '@generated/epicsQuery.graphql';
import { seoServiceInstanceFragment$data } from '@generated/seoServiceInstanceFragment.graphql';
import { useEffect } from 'react';
import { useQueryLoader } from 'react-relay';
interface PreloaderProps {
  serviceInstance: seoServiceInstanceFragment$data;
}

export const PublicEpicListPageLoader = ({
  serviceInstance,
}: PreloaderProps) => {
  const [queryRef, loadQuery] = useQueryLoader<epicsQuery>(EpicListQuery);
  useEffect(() => {
    loadQuery(
      {
        count: 500,

        orderBy: 'title',
        orderMode: 'asc',
      },
      {
        fetchPolicy: 'store-and-network',
      }
    );
  }, [loadQuery, serviceInstance]);

  return (
    <>
      {queryRef ? (
        <PublicEpicList
          serviceInstance={serviceInstance}
          queryRef={queryRef}
        />
      ) : (
        <Skeleton className="w-full inset-1/2" />
      )}
    </>
  );
};
