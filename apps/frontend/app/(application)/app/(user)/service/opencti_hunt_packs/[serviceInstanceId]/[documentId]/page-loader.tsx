'use client';

import Loader from '@/components/Loader';
import OpenctiHuntPackSlug from '@/components/service/opencti-hunt-packs/[slug]/OpenctiHuntPackSlug';
import { toDocumentItem } from '@/components/service/opencti-hunt-packs/hunt-pack-documents';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { useHuntPackDocumentQuery } from '@graphql/generated';
import { useTranslations } from 'next-intl';

interface PreloaderProps {
  documentId: string;
  serviceInstance: serviceInstance_fragment$data;
}

const PageLoader = ({ documentId, serviceInstance }: PreloaderProps) => {
  const t = useTranslations();
  const { data, isPending, isError } = useHuntPackDocumentQuery(
    portalGraphqlClient,
    { documentId, serviceInstanceId: serviceInstance.id }
  );

  if (isPending) {
    return <Loader />;
  }
  if (isError) {
    return <p className="text-muted-foreground">{t('Error.AnErrorOccured')}</p>;
  }
  if (!data.document) {
    return <h1>{t('Utils.DocumentNotFound')}</h1>;
  }

  return (
    <OpenctiHuntPackSlug
      serviceInstance={serviceInstance}
      documentData={toDocumentItem(data.document)}
    />
  );
};

export default PageLoader;
