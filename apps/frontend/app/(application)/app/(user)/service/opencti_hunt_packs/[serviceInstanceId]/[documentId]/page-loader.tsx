'use client';

import Loader from '@/components/Loader';
import { DocumentsItemQuery } from '@/components/service/document/document.graphql';
import OpenctiHuntPackSlug from '@/components/service/opencti-hunt-packs/[slug]/OpenctiHuntPackSlug';
import useMountingLoader from '@/hooks/use-mounting-loader';
import { documentQuery } from '@generated/documentQuery.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { useQueryLoader } from 'react-relay';

interface PreloaderProps {
  documentId: string;
  serviceInstance: serviceInstance_fragment$data;
}

const PageLoader = ({ documentId, serviceInstance }: PreloaderProps) => {
  const [queryRef, loadQuery] =
    useQueryLoader<documentQuery>(DocumentsItemQuery);
  useMountingLoader(loadQuery, {
    documentId,
    serviceInstanceId: serviceInstance?.id,
  });

  return queryRef && serviceInstance ? (
    <OpenctiHuntPackSlug
      serviceInstance={serviceInstance}
      queryRef={queryRef}
    />
  ) : (
    <Loader />
  );
};

export default PageLoader;
