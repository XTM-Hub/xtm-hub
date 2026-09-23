import { ServiceContextProps } from '@/components/service/components/ServiceContext';
import {
  ServiceForm,
  ServiceFormValues,
} from '@/components/service/components/subscribable-services.types';
import { CustomDashboardForm } from '@/components/service/custom-dashboards/[serviceInstanceId]/CustomDashboardForm';
import { CustomViewForm } from '@/components/service/custom-views/[serviceInstanceId]/CustomViewForm';
import {
  DocumentCreateMutation,
  DocumentDeleteMutation,
  DocumentUpdateMutation,
} from '@/components/service/document/document.graphql';
import { ConnectorForm } from '@/components/service/integrations/forms/ConnectorForm';
import { CsvFeedForm } from '@/components/service/integrations/forms/CsvFeedForm';
import { RssFeedForm } from '@/components/service/integrations/forms/RssFeedForm';
import { StreamForm } from '@/components/service/integrations/forms/StreamForm';
import { TaxiiFeedForm } from '@/components/service/integrations/forms/TaxiiFeedForm';
import { ThirdPartyIntegrationForm } from '@/components/service/integrations/forms/ThirdPartyIntegrationForm';
import { OpenaevScenarioForm } from '@/components/service/openaev-scenarios/[serviceInstanceId]/OpenaevScenarioForm';
import { OpenctiPlaybookForm } from '@/components/service/opencti-playbooks/[serviceInstanceId]/OpenctiPlaybookForm';
import { useTranslate } from '@/hooks/use-translate';
import { omit } from '@/lib/omit';
import { pick } from '@/lib/pick';
import { splitFileListToUploadableMap } from '@/relay/environment/fetch-form-data';
import revalidateDocumentSlugsAction from '@/utils/actions/revalidate-document-slugs.actions';
import {
  docIsExistingFile,
  isFile,
  splitExistingAndNewImages,
} from '@/utils/documents';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { toast } from '@filigran/ui';
import { documentCreateMutation } from '@generated/documentCreateMutation.graphql';
import { documentDeleteMutation } from '@generated/documentDeleteMutation.graphql';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { documentUpdateMutation } from '@generated/documentUpdateMutation.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import {
  DocumentMetadataKeyCode,
  IntegrationType,
  LicenseType,
} from '@graphql/generated';
import { useMemo, useState } from 'react';
import { useMutation } from 'react-relay';

type DocumentFormValues = ServiceFormValues & {
  entity_types?: string[] | null;
  license_type?: LicenseType | null;
  solution_categories?: string[] | null;
};

const documentBaseKeys: Array<keyof DocumentFormValues> = [
  'name',
  'slug',
  'uploader_id',
  'uploader_organization_id',
  'short_description',
  'description',
  'use_cases',
  'solution_categories',
  'license_type',
  'entity_types',
  'active',
];

const documentFileKeys: Array<keyof DocumentFormValues> = [
  'document',
  'logo',
  'images',
];

interface UseDocumentContextProps {
  serviceInstance: serviceInstance_fragment$data;
  connectionId?: string;
  type: ShareableResourceType;
}

export function useDocumentContext({
  serviceInstance,
  connectionId,
  type,
}: UseDocumentContextProps): ServiceContextProps {
  const [integrationType, setIntegrationType] = useState<IntegrationType>(
    IntegrationType.CsvFeed
  );
  const t = useTranslate();
  const [createMutation] = useMutation<documentCreateMutation>(
    DocumentCreateMutation
  );

  const handleAddSheet = async (
    values: ServiceFormValues,
    onSuccess: (serviceName: string) => void,
    onError: (error: Error) => void
  ) => {
    const input = omit(
      {
        ...pick(values as DocumentFormValues, documentBaseKeys),
        uploader_id: values?.uploader_id ?? '',
      },
      ['uploader_organization_id']
    );
    const metadata = omit(values as DocumentFormValues, [
      ...documentBaseKeys,
      ...documentFileKeys,
    ]);
    const sourceDocument = Array.from(values?.document ?? []).slice(0, 1);
    const logo = Array.from(values?.logo ?? []).slice(0, 1);
    const images = Array.from(values?.images ?? []);

    createMutation({
      variables: {
        input: {
          ...input,
          active: input.active ?? false,
          use_cases: input.use_cases ?? [],
          solution_categories: input.solution_categories ?? [],
        },
        metadata: Object.keys(metadata)
          .map((key) => ({
            key: key as DocumentMetadataKeyCode,
            value: metadata[key as keyof typeof metadata],
          }))
          .filter(({ value }) => Boolean(value)),
        serviceInstanceId: serviceInstance.id,
        connections: connectionId ? [connectionId] : [],
        sourceDocument: sourceDocument.map(() => ({})),
        logo: logo.map(() => ({})),
        images: images.map(() => ({})),
      },
      uploadables: splitFileListToUploadableMap({
        sourceDocument,
        logo,
        images,
      }),

      onCompleted: (response) => {
        if (!response.createDocument) {
          toast({
            variant: 'destructive',
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
    });
  };

  const [deleteMutation] = useMutation<documentDeleteMutation>(
    DocumentDeleteMutation
  );

  const handleDeleteSheet = async (
    document: documentItem_fragment$data,
    onCompleted: () => void
  ) => {
    deleteMutation({
      variables: {
        documentId: document.id,
        serviceInstanceId: serviceInstance.id,
        connections: connectionId ? [connectionId] : [],
        forceDelete: true,
      },
      onCompleted() {
        if (serviceInstance.slug) {
          revalidateDocumentSlugsAction(serviceInstance.slug, document.slug);
        }
        onCompleted();
      },
    });
  };

  const [updateMutation] = useMutation<documentUpdateMutation>(
    DocumentUpdateMutation
  );

  const handleUpdateSheet = async (
    values: ServiceFormValues,
    resource: documentItem_fragment$data,
    onSuccess: (serviceName: string) => void,
    onError: (error: Error) => void
  ) => {
    const input = omit(
      {
        ...pick(values as DocumentFormValues, documentBaseKeys),
        uploader_id: values?.uploader_id ?? '',
      },
      ['slug']
    );

    const metadata = omit(values as DocumentFormValues, [
      ...documentBaseKeys,
      ...documentFileKeys,
    ]);
    const sourceDocument = Array.from(values?.document ?? []).slice(0, 1);
    const images = Array.from(values?.images ?? []);
    const [existingImageIds, newImages] = splitExistingAndNewImages(images);
    const logo = Array.from(values?.logo ?? []).slice(0, 1);

    updateMutation({
      variables: {
        input,
        serviceInstanceId: serviceInstance.id,
        sourceDocument: sourceDocument.map(() => ({})),
        images: newImages.map(() => ({})),
        ...(isFile(logo[0]) ? { logo: logo.map(() => ({})) } : {}),
        documentId: resource.id,
        metadata: Object.keys(metadata)
          .map((key) => ({
            key: key as DocumentMetadataKeyCode,
            value: metadata[key as keyof typeof metadata],
          }))
          .filter(({ value }) => Boolean(value)),
        existingImageIds: [
          ...existingImageIds,
          ...(docIsExistingFile(logo[0]) ? [logo[0].id] : []),
        ],
      },
      uploadables: splitFileListToUploadableMap({
        sourceDocument,
        images: newImages,
        ...(isFile(logo[0]) ? { logo } : {}),
      }),
      onCompleted: () => {
        if (serviceInstance.slug) {
          revalidateDocumentSlugsAction(serviceInstance.slug, resource.slug);
        }
        onSuccess(values.name);
      },
      onError: (error) => {
        onError(error);
      },
    });
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
  };
}
