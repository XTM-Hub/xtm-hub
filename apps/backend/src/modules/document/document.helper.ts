import {
  DocumentMetadataKeyCode,
  DocumentMetadata as DocumentMetadataResolverType,
  IntegrationType,
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
} from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import {
  DocumentId,
  default as DocumentModel,
} from '../../model/kanel/public/Document';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { UseCaseId } from '../../model/kanel/public/UseCase';
import { MinIOClient } from '../../thirdparty/minio/client';
import { MinioFile } from '../../thirdparty/minio/types';
import { logApp } from '../../utils/app-logger.util';
import { ErrorCode, UnknownErrorCode } from '../../utils/error/error.code';
import { OptionalMetadata } from '../../utils/metadata';
import { WithUseCases } from '../../utils/types';
import { isValidUrl } from '../../utils/utils';
import {
  OPENAEV_SCENARIO_DOCUMENT_TYPE,
  OPENAEV_SCENARIO_METADATA,
  OPENAEV_SCENARIO_METADATA_KEYS,
} from '../shareable-resource/openaev/scenario/scenario.model';
import {
  CUSTOM_DASHBOARD_METADATA,
  CUSTOM_DASHBOARD_METADATA_KEYS,
  OPENCTI_CUSTOM_DASHBOARD_DOCUMENT_TYPE,
} from '../shareable-resource/opencti/custom-dashboard/custom-dashboard.model';
import {
  CUSTOM_VIEW_METADATA,
  CUSTOM_VIEW_METADATA_KEYS,
  OPENCTI_CUSTOM_VIEW_DOCUMENT_TYPE,
} from '../shareable-resource/opencti/custom-view/custom-view.model';
import {
  INTEGRATION_CONNECTOR_METADATA,
  INTEGRATION_CSV_FEED_METADATA,
  INTEGRATION_METADATA_KEYS,
  INTEGRATION_RSS_FEED_METADATA,
  INTEGRATION_STREAM_METADATA,
  INTEGRATION_TAXII_FEED_METADATA,
  INTEGRATION_THIRD_PARTY_INTEGRATION_METADATA,
  isIntegrationType,
  OPENCTI_INTEGRATION_DOCUMENT_TYPE,
} from '../shareable-resource/opencti/integration/integration.model';
import {
  OPENCTI_PLAYBOOK_DOCUMENT_TYPE,
  OPENCTI_PLAYBOOK_METADATA,
  OPENCTI_PLAYBOOK_METADATA_KEYS,
} from '../shareable-resource/opencti/playbook/playbook.model';
import { TelemetryApp } from '../telemetry/telemetry.app';
import { TelemetryEventType } from '../telemetry/telemetry.types';
import { DocumentApp } from './document.app';
import { DOCUMENT_IMAGE_METADATA_KEYS } from './document.model';
import { Upload } from './document.uploads.helper';
import { DocumentDomain } from './domain/document.domain';

export const BOOLEAN_METADATA = [
  DocumentMetadataKeyCode.Verified,
  DocumentMetadataKeyCode.ManagerSupported,
  DocumentMetadataKeyCode.PlaybookSupported,
];

export type Document = WithUseCases<DocumentModel>;
export type WithDocumentId<T> = T & { _document_id: string };
export type WithParentId<T> = T & { _parent_id: string };
export type FullDocumentMutator = Partial<DocumentModel> & {
  use_cases?: UseCaseId[];
  parent_document_id?: DocumentId;
};

export const ALL_METADATA_KEYS: DocumentMetadataKeyCode[] = Array.from(
  new Set([
    ...INTEGRATION_METADATA_KEYS,
    ...CUSTOM_DASHBOARD_METADATA_KEYS,
    ...CUSTOM_VIEW_METADATA_KEYS,
    ...OPENAEV_SCENARIO_METADATA_KEYS,
    ...OPENCTI_PLAYBOOK_METADATA_KEYS,
    ...DOCUMENT_IMAGE_METADATA_KEYS,
  ])
);

export const ServiceDefinitionIdentifiersByPlatformIdentifier = new Map<
  PlatformIdentifier,
  ManageableServiceDefinitionIdentifier[]
>([
  [
    PlatformIdentifier.Opencti,
    [
      ServiceDefinitionIdentifier.OpenctiIntegrations,
      ServiceDefinitionIdentifier.OpenctiCustomDashboards,
      ServiceDefinitionIdentifier.OpenctiCustomViews,
      ServiceDefinitionIdentifier.OpenctiPlaybooks,
    ],
  ],
  [PlatformIdentifier.Openaev, [ServiceDefinitionIdentifier.OpenaevScenarios]],
]);

export type ManageableServiceDefinitionIdentifier =
  | ServiceDefinitionIdentifier.OpenctiIntegrations
  | ServiceDefinitionIdentifier.OpenctiCustomDashboards
  | ServiceDefinitionIdentifier.OpenctiCustomViews
  | ServiceDefinitionIdentifier.OpenaevScenarios
  | ServiceDefinitionIdentifier.OpenctiPlaybooks;

export type DOCUMENT_TYPE =
  | typeof OPENCTI_INTEGRATION_DOCUMENT_TYPE
  | typeof OPENCTI_CUSTOM_DASHBOARD_DOCUMENT_TYPE
  | typeof OPENCTI_CUSTOM_VIEW_DOCUMENT_TYPE
  | typeof OPENAEV_SCENARIO_DOCUMENT_TYPE
  | typeof OPENCTI_PLAYBOOK_DOCUMENT_TYPE;

export const DocumentTypeMappedByServiceDefinition: Record<
  ManageableServiceDefinitionIdentifier,
  DOCUMENT_TYPE
> = {
  [ServiceDefinitionIdentifier.OpenctiIntegrations]:
    OPENCTI_INTEGRATION_DOCUMENT_TYPE,
  [ServiceDefinitionIdentifier.OpenctiCustomDashboards]:
    OPENCTI_CUSTOM_DASHBOARD_DOCUMENT_TYPE,
  [ServiceDefinitionIdentifier.OpenctiCustomViews]:
    OPENCTI_CUSTOM_VIEW_DOCUMENT_TYPE,
  [ServiceDefinitionIdentifier.OpenaevScenarios]:
    OPENAEV_SCENARIO_DOCUMENT_TYPE,
  [ServiceDefinitionIdentifier.OpenctiPlaybooks]:
    OPENCTI_PLAYBOOK_DOCUMENT_TYPE,
};

const DocumentMetadataMappedByServiceIdentifier: Record<
  ManageableServiceDefinitionIdentifier,
  (metadata: DocumentMetadataResolverType[]) => OptionalMetadata[]
> = {
  [ServiceDefinitionIdentifier.OpenctiCustomDashboards]: () =>
    CUSTOM_DASHBOARD_METADATA,
  [ServiceDefinitionIdentifier.OpenctiCustomViews]: () => CUSTOM_VIEW_METADATA,
  [ServiceDefinitionIdentifier.OpenctiIntegrations]: (metadata) => {
    const integrationTypeMetadata = metadata.find(
      (data) => data.key === DocumentMetadataKeyCode.IntegrationType
    );
    if (!integrationTypeMetadata) {
      throw new Error(ErrorCode.DocumentMissingMetadata);
    }

    const integrationType = integrationTypeMetadata.value;
    if (!isIntegrationType(integrationType)) {
      logApp.error(`Integration type is not recognized: ${integrationType}`);
      throw new Error(ErrorCode.IntegrationTypeNotRecognized);
    }

    const metadataKeysMapping: Partial<
      Record<IntegrationType, OptionalMetadata[]>
    > = {
      [IntegrationType.CsvFeed]: INTEGRATION_CSV_FEED_METADATA,
      [IntegrationType.TaxiiFeed]: INTEGRATION_TAXII_FEED_METADATA,
      [IntegrationType.Stream]: INTEGRATION_STREAM_METADATA,
      [IntegrationType.RssFeed]: INTEGRATION_RSS_FEED_METADATA,
      [IntegrationType.ThirdPartyIntegration]:
        INTEGRATION_THIRD_PARTY_INTEGRATION_METADATA,
      [IntegrationType.Connector]: INTEGRATION_CONNECTOR_METADATA,
    };
    const result = metadataKeysMapping[integrationType];
    if (!result) {
      throw new Error(ErrorCode.IntegrationTypeNotManageable);
    }

    return result;
  },
  [ServiceDefinitionIdentifier.OpenaevScenarios]: () =>
    OPENAEV_SCENARIO_METADATA,
  [ServiceDefinitionIdentifier.OpenctiPlaybooks]: () =>
    OPENCTI_PLAYBOOK_METADATA,
};

export const DocumentHelper = {
  buildCompleteMetadataFromDocumentFile: ({
    sourceDocumentFile,
    metadata,
  }: {
    sourceDocumentFile?: MinioFile;
    metadata: DocumentMetadataResolverType[];
  }): DocumentMetadataResolverType[] => {
    const integrationType = metadata.find(
      (meta) => meta.key === DocumentMetadataKeyCode.IntegrationType
    );
    const hasFeedDocumentType =
      integrationType &&
      [
        IntegrationType.CsvFeed,
        IntegrationType.TaxiiFeed,
        IntegrationType.RssFeed,
        IntegrationType.Stream,
      ].includes(integrationType.value as IntegrationType);
    if (!hasFeedDocumentType) {
      return metadata;
    }

    const jsonFileContent = sourceDocumentFile?.jsonContent;
    if (!jsonFileContent) {
      return metadata;
    }

    const uri =
      DocumentHelper.extractUriFromIntegrationJsonFile(jsonFileContent);
    if (!uri || !isValidUrl(uri)) {
      return metadata;
    }

    return [...metadata, { key: DocumentMetadataKeyCode.FeedUrl, value: uri }];
  },

  retrieveDocumentTypeFromServiceDefinition: (
    serviceDefinitionIdentifier: ManageableServiceDefinitionIdentifier
  ): DOCUMENT_TYPE => {
    const documentType =
      DocumentTypeMappedByServiceDefinition[serviceDefinitionIdentifier];
    if (!documentType) {
      throw new Error(ErrorCode.ServiceNotManageable);
    }

    return documentType;
  },

  getMetadataKeysForServiceDefinition: (
    serviceDefinitionIdentifier: ManageableServiceDefinitionIdentifier
  ): DocumentMetadataKeyCode[] => {
    const mapping: Partial<
      Record<ServiceDefinitionIdentifier, DocumentMetadataKeyCode[]>
    > = {
      [ServiceDefinitionIdentifier.OpenctiIntegrations]:
        INTEGRATION_METADATA_KEYS,
      [ServiceDefinitionIdentifier.OpenctiCustomDashboards]:
        CUSTOM_DASHBOARD_METADATA_KEYS,
      [ServiceDefinitionIdentifier.OpenctiCustomViews]:
        CUSTOM_VIEW_METADATA_KEYS,
      [ServiceDefinitionIdentifier.OpenaevScenarios]:
        OPENAEV_SCENARIO_METADATA_KEYS,
      [ServiceDefinitionIdentifier.OpenctiPlaybooks]:
        OPENCTI_PLAYBOOK_METADATA_KEYS,
    };

    return mapping[serviceDefinitionIdentifier] ?? [];
  },

  assertMetadataIsNotMissing: (
    serviceDefinitionIdentifier: ManageableServiceDefinitionIdentifier,
    documentMetadata: DocumentMetadataResolverType[]
  ) => {
    const optionalMetadataMapper =
      DocumentMetadataMappedByServiceIdentifier[serviceDefinitionIdentifier];
    if (!optionalMetadataMapper) {
      throw new Error(UnknownErrorCode.MissingMetadataMapping);
    }
    const optionalMetadata: OptionalMetadata[] =
      DocumentMetadataMappedByServiceIdentifier[serviceDefinitionIdentifier](
        documentMetadata
      );
    const missingMetadataKeys = optionalMetadata.filter(
      ({ key, optional }) =>
        !optional && !documentMetadata.some((meta) => meta.key === key)
    );
    if (missingMetadataKeys.length) {
      logApp.error(
        `Document is missing metadata keys: ${missingMetadataKeys.map(({ key }) => key).join(', ')}`
      );
      throw new Error(ErrorCode.DocumentMissingMetadata);
    }
  },
  isDocumentFileRequired: ({
    documentType,
    documentMetadata,
  }: {
    documentType: DOCUMENT_TYPE;
    documentMetadata: DocumentMetadataResolverType[];
  }): boolean => {
    if (documentType !== OPENCTI_INTEGRATION_DOCUMENT_TYPE) {
      return true;
    }

    const integrationType = documentMetadata.find(
      (meta) => meta.key === DocumentMetadataKeyCode.IntegrationType
    )?.value as unknown as IntegrationType | undefined;

    const isFileProhibited =
      integrationType !== undefined &&
      [
        IntegrationType.Connector,
        IntegrationType.ThirdPartyIntegration,
      ].includes(integrationType);

    return !isFileProhibited;
  },

  assertDocumentFileIsNotMissing: ({
    hasDocument,
    documentType,
    documentMetadata,
  }: {
    hasDocument: boolean;
    documentType: DOCUMENT_TYPE;
    documentMetadata: DocumentMetadataResolverType[];
  }) => {
    const isDocumentFileRequired = DocumentHelper.isDocumentFileRequired({
      documentType,
      documentMetadata,
    });

    if (isDocumentFileRequired && !hasDocument) {
      throw new Error(ErrorCode.DocumentFileMissing);
    }
  },
  deleteFileFromMinIO: async (
    childrenDocumentFromDB: DocumentModel[],
    document: DocumentModel
  ) => {
    if (document.minio_name) {
      await MinIOClient.deleteFile(document.minio_name);
    }
    await Promise.all(
      childrenDocumentFromDB.flatMap((doc) =>
        doc.minio_name !== null ? [MinIOClient.deleteFile(doc.minio_name)] : []
      )
    );
  },

  getDocumentName: (documentName: string) => {
    const splitName = documentName.split('.');
    const nameWithoutExtension = splitName[0];
    const extensionName = splitName[1];
    return `${nameWithoutExtension}_${Date.now()}.${extensionName}`;
  },

  normalizeDocumentName: (documentName: string = ''): string => {
    return documentName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\-_.]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  },

  checkDocumentExists: async (
    documentName: string,
    serviceInstanceId: ServiceInstanceId
  ) => {
    const document = await DocumentDomain.loadDocumentBy({
      file_name: DocumentHelper.normalizeDocumentName(documentName),
      active: true,
      service_instance_id: serviceInstanceId,
    });
    return !!document;
  },

  uploadNewFile: async (
    document: Upload,
    serviceInstanceId: ServiceInstanceId
  ) => {
    if (!document || !document.file) {
      return;
    }
    const user = requestContext.requireUser();
    const { minioName } = await MinIOClient.sendFile(
      document.file,
      document.file.filename,
      user.id,
      serviceInstanceId
    );

    const data: FullDocumentMutator = {
      uploader_id: user.id,
      name: serviceInstanceId,
      minio_name: minioName,
      file_name: document.file.filename,
      service_instance_id: serviceInstanceId,
      created_at: new Date(),
      mime_type: document.file.mimetype,
      type: 'service_picture',
    };

    return DocumentApp.createDocumentWithChildrenAndMetadata(data, []);
  },

  updateDocumentWithCounters: async <T extends Document>(document: T) => {
    let download_number = 0;
    let share_number = 0;
    try {
      [download_number, share_number] = await Promise.all([
        TelemetryApp.countEventsByDocumentId(
          TelemetryEventType.DOWNLOAD,
          document.id
        ),
        TelemetryApp.countEventsByDocumentId(
          TelemetryEventType.SHARE,
          document.id
        ),
      ]);
    } catch (error) {
      logApp.error('Unable to fetch counters from elastic search', { error });
    }

    return {
      ...document,
      download_number,
      share_number,
    };
  },

  loadDocumentWithCountersById: async <T extends Document>(
    id: string,
    include_metadata: DocumentMetadataKeyCode[] = []
  ) => {
    const document: T = await DocumentDomain.loadDocumentWithMetadataById(
      id,
      include_metadata
    );
    if (!document) {
      throw new Error(ErrorCode.DocumentNotFound);
    }

    return DocumentHelper.updateDocumentWithCounters(document);
  },

  loadSeoDocumentWithCountersBySlug: async <T extends Document>(
    type: DOCUMENT_TYPE,
    slug: string,
    include_metadata: DocumentMetadataKeyCode[] = []
  ) => {
    const document: T = await DocumentDomain.loadSeoDocumentBySlug(
      type,
      slug,
      include_metadata
    );
    if (!document) {
      throw new Error(ErrorCode.DocumentNotFound);
    }

    return DocumentHelper.updateDocumentWithCounters(document);
  },

  extractUriFromIntegrationJsonFile: (
    jsonFileContent: MinioFile['jsonContent']
  ) => {
    const configuration = (jsonFileContent as { configuration?: unknown })
      .configuration;
    const uri =
      configuration &&
      typeof configuration === 'object' &&
      'uri' in configuration &&
      typeof (configuration as { uri: unknown }).uri === 'string'
        ? (configuration as { uri: string }).uri
        : undefined;

    return uri;
  },
};
