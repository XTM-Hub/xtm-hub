import { ServiceContextProps } from '@/components/service/components/ServiceContext';
import {
  ServiceForm,
  ServiceFormValues,
} from '@/components/service/components/subscribable-services.types';
import { CustomDashboardForm } from '@/components/service/custom-dashboards/[serviceInstanceId]/CustomDashboardForm';
import { CustomViewForm } from '@/components/service/custom-views/[serviceInstanceId]/CustomViewForm';
import {
  DocumentFormValues,
  toCreateDocumentInput,
  toDocumentMetadata,
  toDocumentUploads,
  toUpdateDocumentInput,
} from '@/components/service/document/document-mutation.utils';
import {
  invalidateDocumentQueries,
  invalidateDocumentQueriesAfterDelete,
} from '@/components/service/document/document-query-invalidation';
import { ConnectorForm } from '@/components/service/integrations/forms/ConnectorForm';
import { CsvFeedForm } from '@/components/service/integrations/forms/CsvFeedForm';
import { RssFeedForm } from '@/components/service/integrations/forms/RssFeedForm';
import { StreamForm } from '@/components/service/integrations/forms/StreamForm';
import { TaxiiFeedForm } from '@/components/service/integrations/forms/TaxiiFeedForm';
import { ThirdPartyIntegrationForm } from '@/components/service/integrations/forms/ThirdPartyIntegrationForm';
import { OpenaevScenarioForm } from '@/components/service/openaev-scenarios/[serviceInstanceId]/OpenaevScenarioForm';
import { OpenctiPlaybookForm } from '@/components/service/opencti-playbooks/[serviceInstanceId]/OpenctiPlaybookForm';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  GraphqlUploads,
  requestGraphqlWithUploads,
} from '@/lib/graphql-upload-client';
import revalidateDocumentSlugsAction from '@/utils/actions/revalidate-document-slugs.actions';
import {
  docIsExistingFile,
  isFile,
  splitExistingAndNewImages,
} from '@/utils/documents';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import {
  DocumentCreateDocument,
  DocumentCreateMutation,
  DocumentCreateMutationVariables,
  DocumentItemFragment,
  DocumentUpdateDocument,
  DocumentUpdateMutation,
  DocumentUpdateMutationVariables,
  IntegrationType,
  useDocumentCreateMutation,
  useDocumentDeleteMutation,
  useDocumentUpdateMutation,
} from '@graphql/generated';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

interface UseDocumentContextProps {
  serviceInstance: serviceInstance_fragment$data;
  type: ShareableResourceType;
}

interface DocumentMutationPayload<TVariables> {
  variables: TVariables;
  uploads: GraphqlUploads;
}

export function useDocumentContext({
  serviceInstance,
  type,
}: UseDocumentContextProps): ServiceContextProps {
  const [integrationType, setIntegrationType] = useState<IntegrationType>(
    IntegrationType.CsvFeed
  );
  const t = useTranslate();
  const queryClient = useQueryClient();

  // graphql-request serialises every variable as JSON, so a request carrying a
  // file goes through the multipart client, and one without keeps the plain
  // generated fetcher.
  const { mutate: createMutation, isPending: isCreateInFlight } = useMutation({
    mutationFn: ({
      variables,
      uploads,
    }: DocumentMutationPayload<DocumentCreateMutationVariables>) =>
      Object.keys(uploads).length === 0
        ? useDocumentCreateMutation.fetcher(portalGraphqlClient, variables)()
        : requestGraphqlWithUploads<
            DocumentCreateMutation,
            DocumentCreateMutationVariables
          >(DocumentCreateDocument, variables, uploads),
    onSuccess: () => invalidateDocumentQueries(queryClient),
  });

  const handleAddSheet = async (
    values: ServiceFormValues,
    onSuccess: (serviceName: string) => void,
    onError: (error: Error) => void
  ) => {
    const input = toCreateDocumentInput(values as DocumentFormValues);
    const [sourceDocument] = Array.from(values?.document ?? []);
    const [logo] = Array.from(values?.logo ?? []);
    const images = Array.from(values?.images ?? []);

    createMutation(
      {
        variables: {
          input,
          metadata: toDocumentMetadata(values as DocumentFormValues),
          serviceInstanceId: serviceInstance.id,
          sourceDocument: null,
          logo: null,
          images: null,
        },
        uploads: toDocumentUploads({ sourceDocument, logo, images }),
      },
      {
        onSuccess: (response) => {
          if (!response.createDocument) {
            showSnackbar({
              severity: 'error',
              title: t('Utils.Error'),
              description: t('Error.AnErrorOccured'),
            });
            return;
          }

          if (serviceInstance.slug) {
            revalidateDocumentSlugsAction(serviceInstance.slug);
          }
          onSuccess(input.name);
        },
        onError: (error) => {
          onError(error);
        },
      }
    );
  };

  const { mutate: deleteMutation } = useDocumentDeleteMutation(
    portalGraphqlClient,
    { onSuccess: () => invalidateDocumentQueriesAfterDelete(queryClient) }
  );

  const handleDeleteSheet = async (
    document: DocumentItemFragment,
    onCompleted: () => void
  ) => {
    deleteMutation(
      {
        documentId: document.id,
        serviceInstanceId: serviceInstance.id,
        forceDelete: true,
      },
      {
        onSuccess: () => {
          if (serviceInstance.slug) {
            revalidateDocumentSlugsAction(serviceInstance.slug, document.slug);
          }
          onCompleted();
        },
      }
    );
  };

  const { mutate: updateMutation, isPending: isUpdateInFlight } = useMutation({
    mutationFn: ({
      variables,
      uploads,
    }: DocumentMutationPayload<DocumentUpdateMutationVariables>) =>
      Object.keys(uploads).length === 0
        ? useDocumentUpdateMutation.fetcher(portalGraphqlClient, variables)()
        : requestGraphqlWithUploads<
            DocumentUpdateMutation,
            DocumentUpdateMutationVariables
          >(DocumentUpdateDocument, variables, uploads),
    onSuccess: () => invalidateDocumentQueries(queryClient),
  });

  const handleUpdateSheet = async (
    values: ServiceFormValues,
    resource: DocumentItemFragment,
    onSuccess: (serviceName: string) => void,
    onError: (error: Error) => void
  ) => {
    const [sourceDocument] = Array.from(values?.document ?? []);
    const images = Array.from(values?.images ?? []);
    const [existingImageIds, newImages] = splitExistingAndNewImages(images);
    const [logo] = Array.from(values?.logo ?? []);

    updateMutation(
      {
        variables: {
          input: toUpdateDocumentInput(values as DocumentFormValues),
          serviceInstanceId: serviceInstance.id,
          sourceDocument: null,
          images: null,
          logo: null,
          documentId: resource.id,
          metadata: toDocumentMetadata(values as DocumentFormValues),
          existingImageIds: [
            ...existingImageIds,
            ...(docIsExistingFile(logo) ? [logo.id] : []),
          ],
        },
        uploads: toDocumentUploads({
          sourceDocument,
          logo: isFile(logo) ? logo : undefined,
          images: newImages,
        }),
      },
      {
        onSuccess: () => {
          if (serviceInstance.slug) {
            revalidateDocumentSlugsAction(serviceInstance.slug, resource.slug);
          }
          onSuccess(values.name);
        },
        onError: (error) => {
          onError(error);
        },
      }
    );
  };

  const form = useMemo(() => {
    const formMapping: Record<ShareableResourceType, () => ServiceForm> = {
      [ShareableResourceType.OPENAEV_SCENARIO]: () => OpenaevScenarioForm,
      [ShareableResourceType.OPENCTI_PLAYBOOK]: () => OpenctiPlaybookForm,
      [ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD]: () =>
        CustomDashboardForm,
      [ShareableResourceType.OPENCTI_CUSTOM_VIEW]: () => CustomViewForm,
      [ShareableResourceType.OPENCTI_INTEGRATION]: () => {
        const integrationMapping: Partial<
          Record<IntegrationType, ServiceForm>
        > = {
          [IntegrationType.CsvFeed]: CsvFeedForm,
          [IntegrationType.TaxiiFeed]: TaxiiFeedForm,
          [IntegrationType.RssFeed]: RssFeedForm,
          [IntegrationType.Stream]: StreamForm,
          [IntegrationType.ThirdPartyIntegration]: ThirdPartyIntegrationForm,
          [IntegrationType.Connector]: ConnectorForm,
        };

        return integrationMapping[integrationType] ?? CsvFeedForm;
      },
    };

    return formMapping[type]();
  }, [type, integrationType]);

  const translationKey = useMemo(() => {
    const translationKeyMapping: Record<ShareableResourceType, () => string> = {
      [ShareableResourceType.OPENAEV_SCENARIO]: () => 'Service.OpenAEVScenario',
      [ShareableResourceType.OPENCTI_PLAYBOOK]: () => 'Service.OpenCTIPlaybook',
      [ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD]: () =>
        'Service.OpenctiCustomDashboards',
      [ShareableResourceType.OPENCTI_CUSTOM_VIEW]: () =>
        'Service.OpenctiCustomViews',
      [ShareableResourceType.OPENCTI_INTEGRATION]: () => {
        const integrationMapping: Partial<Record<IntegrationType, string>> = {
          [IntegrationType.CsvFeed]: 'Service.CsvFeed',
          [IntegrationType.TaxiiFeed]: 'Service.TaxiiFeed',
          [IntegrationType.RssFeed]: 'Service.RssFeed',
          [IntegrationType.Stream]: 'Service.Stream',
          [IntegrationType.ThirdPartyIntegration]:
            'Service.ThirdPartyIntegration',
          [IntegrationType.Connector]: 'Service.Connector',
        };

        return integrationMapping[integrationType] ?? '';
      },
    };

    return translationKeyMapping[type]();
  }, [type, integrationType]);

  return {
    serviceInstance,
    handleAddSheet,
    handleUpdateSheet,
    handleDeleteSheet,
    ServiceForm: form,
    translationKey,
    type,
    setIntegrationType,
    isSubmitting: isCreateInFlight || isUpdateInFlight,
  };
}
