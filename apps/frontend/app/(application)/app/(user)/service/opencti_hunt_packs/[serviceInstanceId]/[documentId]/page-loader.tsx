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
  const { data, error, isPending, isError } = useHuntPackDocumentQuery(
    portalGraphqlClient,
    { documentId, serviceInstanceId: serviceInstance.id }
  );
  const notFound = <h1>{t('Utils.DocumentNotFound')}</h1>;

  if (isPending) {
    return <Loader />;
  }
  if (isError) {
    // The API reports an unknown or inaccessible document as DOCUMENT_NOT_FOUND.
    return error instanceof Error && error.message === 'DOCUMENT_NOT_FOUND' ? (
      notFound
    ) : (
      <p className="text-muted-foreground">{t('Error.AnErrorOccured')}</p>
    );
  }
  if (!data.document) {
    return notFound;
  }

  return (
    <OpenctiHuntPackSlug
      serviceInstance={serviceInstance}
      documentData={toDocumentItem(data.document)}
    />
  );
};

export default PageLoader;
