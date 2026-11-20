import config from 'config';
import { toGlobalId } from 'graphql-relay/node/node.js';
import {
  DocumentMetadataKeyCode,
  DocumentMetadata as DocumentMetadataResolverType,
  DocumentStatus,
  IntegrationType,
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
} from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import {
  DocumentId,
  default as DocumentModel,
} from '../../model/kanel/public/Document';
import ServiceDefinition from '../../model/kanel/public/ServiceDefinition';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { UseCaseId } from '../../model/kanel/public/UseCase';
import User, { UserId } from '../../model/kanel/public/User';
import { MinIOClient } from '../../thirdparty/minio/client';
import { MinioFile } from '../../thirdparty/minio/types';
import type {
  TeamsNotificationPayloadMap,
  TeamsResourceItem,
} from '../../thirdparty/pgboss/teams-notification.jobs';
import { logApp } from '../../utils/app-logger.util';
import { ErrorCode, UnknownErrorCode } from '../../utils/error/error.code';
import { OptionalMetadata } from '../../utils/metadata';
import { PlatformIdentifierToString } from '../../utils/platform';
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
import {
  DocumentDomain,
  type NotPublishedResource,
} from './domain/document.domain';

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

export const MANAGEABLE_SERVICE_DEFINITION_IDENTIFIERS = [
  ServiceDefinitionIdentifier.OpenctiIntegrations,
  ServiceDefinitionIdentifier.OpenctiCustomDashboards,
  ServiceDefinitionIdentifier.OpenctiCustomViews,
  ServiceDefinitionIdentifier.OpenaevScenarios,
  ServiceDefinitionIdentifier.OpenctiPlaybooks,
] as const;

export type ManageableServiceDefinitionIdentifier =
  (typeof MANAGEABLE_SERVICE_DEFINITION_IDENTIFIERS)[number];

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

// Bounds of the meta description generated from the summary (see DocumentHelper.buildMetaDescription), not of the
// summary itself. Below the minimum, search engines tend to replace the <meta name="description"> with an excerpt of
// the page; the maximum is the length they display.
export const META_DESCRIPTION_MIN_LENGTH = 120;
export const META_DESCRIPTION_MAX_LENGTH = 160;

// The em dash (U+2014) and the en dash (U+2013) are refused in a meta description; the hyphen is allowed.
const META_DESCRIPTION_FORBIDDEN_DASHES = /[\u2013\u2014]/;

export const META_DESCRIPTION_TYPE_LABELS: Record<
  ManageableServiceDefinitionIdentifier,
  string
> = {
  [ServiceDefinitionIdentifier.OpenctiCustomDashboards]: 'Dashboard',
  [ServiceDefinitionIdentifier.OpenaevScenarios]: 'Scenario',
  [ServiceDefinitionIdentifier.OpenctiCustomViews]: 'Custom View',
  // Every integration subtype (connector, feeds, stream, third party) shares this label.
  [ServiceDefinitionIdentifier.OpenctiIntegrations]: 'Integration',
  [ServiceDefinitionIdentifier.OpenctiPlaybooks]: 'Playbook',
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

const ALLOWED_STATUS_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  [DocumentStatus.Draft]: [DocumentStatus.InValidation],
  [DocumentStatus.InValidation]: [DocumentStatus.Published],
  [DocumentStatus.Published]: [],
};

const CREATABLE_STATUSES: DocumentStatus[] = [
  DocumentStatus.Draft,
  DocumentStatus.InValidation,
];

const INTEGRATION_TYPE_LABELS: Record<IntegrationType, string> = {
  [IntegrationType.Connector]: 'Connector',
  [IntegrationType.CsvFeed]: 'CSV Feed',
  [IntegrationType.RssFeed]: 'RSS Feed',
  [IntegrationType.Stream]: 'Stream',
  [IntegrationType.TaxiiFeed]: 'TAXII Feed',
  [IntegrationType.ThirdPartyIntegration]: 'Third party integration',
};

export interface NotPublishedResourceInput {
  document: DocumentModel;
  integrationType: IntegrationType | null;
  authorEmail: string | null;
}

export interface NotPublishedLibrary {
  serviceDefinition: NotPublishedResource['serviceDefinition'];
  resources: NotPublishedResourceInput[];
}

const buildResourceItem = ({
  document,
  status,
  serviceDefinition,
  integrationType,
  authorEmail,
}: {
  document: DocumentModel;
  status: DocumentStatus;
  serviceDefinition: Pick<ServiceDefinition, 'identifier'>;
  integrationType: IntegrationType | null;
  authorEmail: string | null;
}): TeamsResourceItem => ({
  name: document.name,
  type: integrationType ? INTEGRATION_TYPE_LABELS[integrationType] : null,
  status,
  short_description: document.short_description,
  link: `${config.get<string>('base_url_front')}/redirect/${serviceDefinition.identifier}?document_id=${toGlobalId('Document', document.id)}`,
  author_email: authorEmail,
});

export const DocumentHelper = {
  assertCreationStatus: (status: DocumentStatus) => {
    if (!CREATABLE_STATUSES.includes(status)) {
      throw new Error(ErrorCode.InvalidDocumentCreationStatus);
    }
  },

  assertStatusTransition: (from: DocumentStatus, to: DocumentStatus) => {
    if (from !== to && !ALLOWED_STATUS_TRANSITIONS[from].includes(to)) {
      throw new Error(ErrorCode.InvalidDocumentStatusTransition);
    }
  },

  /** Name of the product a resource belongs to, e.g. OpenCTI for a custom dashboard. */
  getProductName: (
    serviceDefinitionIdentifier: ManageableServiceDefinitionIdentifier
  ): string => {
    for (const [
      platformIdentifier,
      serviceDefinitionIdentifiers,
    ] of ServiceDefinitionIdentifiersByPlatformIdentifier) {
      if (serviceDefinitionIdentifiers.includes(serviceDefinitionIdentifier)) {
        return PlatformIdentifierToString[platformIdentifier];
      }
    }
    throw new Error(ErrorCode.ServiceNotManageable);
  },

  /**
   * The meta description published on the resource page: "{Product} {TypeLabel}: {summary}.", where the summary is
   * the meta_description stored on the document. A summary that already ends with a period gets no second one, so
   * that a summary written as a full sentence does not end up with "..".
   */
  buildMetaDescription: ({
    serviceDefinitionIdentifier,
    summary,
  }: {
    serviceDefinitionIdentifier: ManageableServiceDefinitionIdentifier;
    summary: string;
  }): string => {
    const trimmedSummary = summary.trim();
    const period = trimmedSummary.endsWith('.') ? '' : '.';
    return `${DocumentHelper.getProductName(serviceDefinitionIdentifier)} ${META_DESCRIPTION_TYPE_LABELS[serviceDefinitionIdentifier]}: ${trimmedSummary}${period}`;
  },

  /** Throws when the generated meta description breaks a publishing rule; title is the document name (the page h1). */
  validateGeneratedMetaDescription: ({
    metaDescription,
    title,
  }: {
    metaDescription: string;
    title: string | null;
  }) => {
    if (metaDescription.length < META_DESCRIPTION_MIN_LENGTH) {
      throw new Error(ErrorCode.MetaDescriptionTooShort);
    }
    if (metaDescription.length > META_DESCRIPTION_MAX_LENGTH) {
      throw new Error(ErrorCode.MetaDescriptionTooLong);
    }
    if (META_DESCRIPTION_FORBIDDEN_DASHES.test(metaDescription)) {
      throw new Error(ErrorCode.MetaDescriptionInvalidDash);
    }
    const normalizedTitle = title?.trim().toLowerCase();
    // An empty title would prefix every text: there is nothing to compare against.
    if (
      normalizedTitle &&
      metaDescription.trim().toLowerCase().startsWith(normalizedTitle)
    ) {
      throw new Error(ErrorCode.MetaDescriptionMatchesTitle);
    }
  },

  /** Returns the trimmed summary to store on creation, where it is required. */
  validateMetaDescription: ({
    serviceDefinitionIdentifier,
    summary,
    name,
  }: {
    serviceDefinitionIdentifier: ManageableServiceDefinitionIdentifier;
    summary: string;
    name: string;
  }): string => {
    const trimmedSummary = summary.trim();
    if (!trimmedSummary) {
      throw new Error(ErrorCode.MetaDescriptionRequired);
    }
    DocumentHelper.validateGeneratedMetaDescription({
      metaDescription: DocumentHelper.buildMetaDescription({
        serviceDefinitionIdentifier,
        summary: trimmedSummary,
      }),
      title: name,
    });
    return trimmedSummary;
  },

  /**
   * Returns the trimmed summary of an update, or undefined when none is given: the documents created before the field
   * existed have none and stay editable, so an empty value leaves the stored one untouched.
   * The generated meta description depends on both the summary and the name, so it is validated again whenever the
   * update changes either of them, each taken from the input or else from the stored document. A document left without
   * a summary is not validated.
   */
  validateUpdatedMetaDescription: ({
    serviceDefinitionIdentifier,
    summary,
    name,
    storedDocument,
  }: {
    serviceDefinitionIdentifier: ManageableServiceDefinitionIdentifier;
    summary: string | null | undefined;
    name: string | null | undefined;
    storedDocument: Pick<DocumentModel, 'meta_description' | 'name'>;
  }): string | undefined => {
    const inputSummary = summary?.trim() || undefined;
    const nextSummary = inputSummary ?? storedDocument.meta_description;
    const nextName = name ?? storedDocument.name;
    const changed =
      nextSummary !== storedDocument.meta_description ||
      nextName !== storedDocument.name;
    if (nextSummary && changed) {
      DocumentHelper.validateGeneratedMetaDescription({
        metaDescription: DocumentHelper.buildMetaDescription({
          serviceDefinitionIdentifier,
          summary: nextSummary,
        }),
        title: nextName,
      });
    }
    return inputSummary;
  },

  toIntegrationType: (
    documentType: string,
    value: unknown
  ): IntegrationType | null =>
    documentType === OPENCTI_INTEGRATION_DOCUMENT_TYPE &&
    typeof value === 'string' &&
    isIntegrationType(value)
      ? value
      : null,

  groupNotPublishedByLibrary: ({
    notPublished,
    authors,
    integrationTypes,
  }: {
    notPublished: NotPublishedResource[];
    authors: Pick<User, 'id' | 'email'>[];
    integrationTypes: { document_id: string; value: string }[];
  }): NotPublishedLibrary[] => {
    const authorEmails = new Map<UserId, string>(
      authors.map(({ id, email }) => [id, email])
    );
    const integrationTypeByDocument = new Map(
      integrationTypes.map(({ document_id, value }) => [document_id, value])
    );

    const libraries = new Map<string, NotPublishedLibrary>();
    for (const { document, serviceDefinition } of notPublished) {
      const library = libraries.get(serviceDefinition.id) ?? {
        serviceDefinition,
        resources: [],
      };
      library.resources.push({
        document,
        integrationType: DocumentHelper.toIntegrationType(
          document.type,
          integrationTypeByDocument.get(document.id)
        ),
        authorEmail: document.uploader_id
          ? (authorEmails.get(document.uploader_id) ?? null)
          : null,
      });
      libraries.set(serviceDefinition.id, library);
    }
    return [...libraries.values()];
  },

  buildInValidationPayload: ({
    document,
    serviceDefinition,
    integrationType,
    authorEmail,
  }: {
    document: DocumentModel;
    serviceDefinition: Pick<ServiceDefinition, 'name' | 'identifier'>;
    integrationType: IntegrationType | null;
    authorEmail: string | null;
  }): TeamsNotificationPayloadMap['resource_in_validation'] => ({
    library: serviceDefinition.name,
    resource: buildResourceItem({
      document,
      status: DocumentStatus.InValidation,
      serviceDefinition,
      integrationType,
      authorEmail,
    }),
  }),

  buildNotPublishedPayload: ({
    serviceDefinition,
    resources,
  }: {
    serviceDefinition: Pick<ServiceDefinition, 'name' | 'identifier'>;
    resources: NotPublishedResourceInput[];
  }): TeamsNotificationPayloadMap['resource_not_published'] => ({
    library: serviceDefinition.name,
    resources: resources.map(({ document, integrationType, authorEmail }) =>
      buildResourceItem({
        document,
        status: document.status,
        serviceDefinition,
        integrationType,
        authorEmail,
      })
    ),
  }),

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

  // Best effort: the data is already committed, so a storage failure is logged
  // and leaves an orphan file instead of failing the caller.
  deleteObsoleteFiles: async (minioNames: string[]) => {
    await Promise.all(
      minioNames.map(async (minioName) => {
        try {
          await MinIOClient.deleteFile(minioName);
        } catch (error) {
          logApp.error(`Unable to delete the obsolete file ${minioName}`, {
            error,
          });
        }
      })
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
