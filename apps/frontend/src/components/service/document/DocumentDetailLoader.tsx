'use client';

import Loader from '@/components/Loader';
import { ServiceLoadError } from '@/components/service/components/ServiceLoadError';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  DocumentItemFragment,
  useDocumentDetailQuery,
} from '@graphql/generated';
import { ReactNode } from 'react';

interface DocumentDetailLoaderProps {
  documentId: string;
  serviceInstanceId: string;
  children: (document: DocumentItemFragment) => ReactNode;
}

/**
 * Loads a document for the detail page of a shareable resource and hands it to
 * `children` once it is there. Updating the document invalidates the query, so
 * the page rerenders with the saved data.
 */
const DocumentDetailLoader = ({
  documentId,
  serviceInstanceId,
  children,
}: DocumentDetailLoaderProps) => {
  const t = useTranslate();
  const { data, isError, refetch } = useDocumentDetailQuery(
    portalGraphqlClient,
    { documentId, serviceInstanceId }
  );

  // A failed background refetch keeps the page already on screen.
  if (isError && !data) {
    return (
      <ServiceLoadError
        message={t('Error.AnErrorOccured')}
        onRetry={() => void refetch()}
      />
    );
  }

  if (!data) {
    return <Loader />;
  }

  // `document` is nullable in the schema.
  return data.document ? (
    children(data.document)
  ) : (
    <h1>{t('Utils.DocumentNotFound')}</h1>
  );
};

export default DocumentDetailLoader;
