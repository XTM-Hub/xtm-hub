'use client';

import Loader from '@/components/Loader';
import HuntPackLoadError from '@/components/service/opencti-hunt-packs/HuntPackLoadError';
import OpenctiHuntPackSlug from '@/components/service/opencti-hunt-packs/[slug]/OpenctiHuntPackSlug';
import { toDocumentItem } from '@/components/service/opencti-hunt-packs/hunt-pack-documents';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { APP_PATH } from '@/utils/path/constant';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { useHuntPackDocumentQuery } from '@graphql/generated';

interface PreloaderProps {
  documentId: string;
  serviceInstance: serviceInstance_fragment$data;
}

const PageLoader = ({ documentId, serviceInstance }: PreloaderProps) => {
  const t = useTranslate();
  const { data, error, isPending, isError, isFetching, refetch } =
    useHuntPackDocumentQuery(portalGraphqlClient, {
      documentId,
      serviceInstanceId: serviceInstance.id,
    });
  // Without a hunt pack to show, the way back to the library stays visible.
  const libraryBreadcrumb = (
    <BreadcrumbNav
      value={[
        { label: 'MenuLinks.Home', href: `/${APP_PATH}` },
        {
          label: serviceInstance.name,
          href: `/${APP_PATH}/service/${serviceInstance.service_definition?.identifier}/${serviceInstance.id}`,
          original: true,
        },
      ]}
    />
  );
  const notFound = (
    <>
      {libraryBreadcrumb}
      <h1>{t('Utils.DocumentNotFound')}</h1>
    </>
  );

  if (isPending) {
    return <Loader />;
  }
  if (isError) {
    // The API reports an unknown or inaccessible document as DOCUMENT_NOT_FOUND.
    return error instanceof Error && error.message === 'DOCUMENT_NOT_FOUND' ? (
      notFound
    ) : (
      <>
        {libraryBreadcrumb}
        <HuntPackLoadError
          error={error}
          description={t('Service.OpenCTIHuntPack.LoadError.Document')}
          retrying={isFetching}
          onRetry={() => refetch()}
        />
      </>
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
