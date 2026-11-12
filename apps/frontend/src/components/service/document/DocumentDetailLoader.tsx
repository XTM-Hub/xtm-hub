'use client';

import Loader from '@/components/Loader';
import { ServiceLoadError } from '@/components/service/components/ServiceLoadError';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { retryUnlessUnauthenticated } from '@/lib/query-client';
import {
  DocumentItemFragment,
  useDocumentDetailQuery,
} from '@graphql/generated';
import { ReactNode } from 'react';

// What the API throws, as the message of the error, for a document it does not know.
const DOCUMENT_NOT_FOUND_ERROR = 'DOCUMENT_NOT_FOUND';

const isDocumentNotFound = (error: unknown) =>
  error instanceof Error && error.message === DOCUMENT_NOT_FOUND_ERROR;

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
  const { data, error, isError, refetch } = useDocumentDetailQuery(
    portalGraphqlClient,
    { documentId, serviceInstanceId },
    {
      // Asking again cannot make a missing document appear, it only keeps the
      // loader on screen through every retry.
      retry: (failureCount, queryError) =>
        !isDocumentNotFound(queryError) &&
        retryUnlessUnauthenticated(failureCount, queryError),
    }
  );

  // Even with a cached document: a failed background refetch keeps the previous
  // `data`, and a document deleted elsewhere must not stay on screen with its actions.
  if (isDocumentNotFound(error)) {
    return <h1>{t('Utils.DocumentNotFound')}</h1>;
  }

  // A failed background refetch keeps the page already on screen.
  if (isError && !data) {
    return (
      <ServiceLoadError
        message={t('Error.AnErrorOccured')}
        retryAnalyticsId="resource_detail_refresh"
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
