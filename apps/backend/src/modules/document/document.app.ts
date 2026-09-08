import {
  CreateDocumentInput,
  DocumentImageType,
  DocumentMetadataKeyCode,
  DocumentMetadata as DocumentMetadataResolverType,
  FiligranProduct,
  MutationUpdateDocumentArgs as MutationUpdateDocumentArgsResolverType,
  PlatformIdentifier,
  QueryDocumentsArgs,
  QueryPublicDocumentsArgs,
} from '../../__generated__/resolvers-types';
import { withTransaction } from '../../context/database.context';
import { requestContext } from '../../context/request.context';
import Document, {
  DocumentId,
  default as DocumentModel,
} from '../../model/kanel/public/Document';
import { ObjectSolutionCategoryObjectId } from '../../model/kanel/public/ObjectSolutionCategory';
import { ObjectUseCaseObjectId } from '../../model/kanel/public/ObjectUseCase';
import ServiceDefinition from '../../model/kanel/public/ServiceDefinition';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { SolutionCategoryId } from '../../model/kanel/public/SolutionCategory';
import { logApp } from '../../utils/app-logger.util';
import { ErrorCode, UnknownErrorCode } from '../../utils/error/error.code';
import { ForbiddenAccess } from '../../utils/error/error.util';
import { NewsFeedApp } from '../news-feed/news-feed.app';
import { RegistrationApp } from '../registration/registration.app';
import { ServiceDefinitionDomain } from '../service/definition/service-definition.domain';
import { objectSolutionCategoryDomain } from '../solution-category/object-solution-category/object-solution-category.domain';
import { solutionCategoryApp } from '../solution-category/solution-category.app';
import { TelemetryApp } from '../telemetry/telemetry.app';
import { TelemetryHelper } from '../telemetry/telemetry.helper';
import { objectUseCaseDomain } from '../use-case/object-use-case/object-use-case.domain';
import { useCaseApp } from '../use-case/use-case.app';
import {
  ALL_METADATA_KEYS,
  BOOLEAN_METADATA,
  DOCUMENT_TYPE,
  DocumentHelper,
  DocumentTypeMappedByServiceDefinition,
  ManageableServiceDefinitionIdentifier,
  ServiceDefinitionIdentifiersByPlatformIdentifier,
} from './document.helper';
import { DocumentUploadsHelper, Upload } from './document.uploads.helper';
import { DocumentChildrenDomain } from './domain/document.children.domain';
import { DocumentData, DocumentDomain } from './domain/document.domain';
import {
  DocumentMetadataDomain,
  DocumentMetadataKeys,
} from './domain/document.metadata.domain';

type DocumentMetadataValue = string | boolean | null;
type DocumentWithDynamicMetadata = DocumentModel &
  Record<string, DocumentMetadataValue>;

const toObjectUseCaseObjectId = (id: string): ObjectUseCaseObjectId =>
  id as ObjectUseCaseObjectId;
const toObjectSolutionCategoryObjectId = (
  id: string
): ObjectSolutionCategoryObjectId => id as ObjectSolutionCategoryObjectId;

const setDocumentMetadataValue = (
  document: DocumentModel,
  key: string,
  value: DocumentMetadataValue
): void => {
  (document as DocumentWithDynamicMetadata)[key] = value;
};

export const DocumentApp = {
  createDocument: async ({
    input,
    metadata,
    serviceInstanceId,
    sourceDocument,
    logo,
    images = [],
  }: {
    input: CreateDocumentInput;
    metadata: DocumentMetadataResolverType[];
    serviceInstanceId: ServiceInstanceId;
    sourceDocument?: Upload;
    logo?: Upload;
    images?: Upload[];
  }) => {
    const serviceDefinition =
      await ServiceDefinitionDomain.loadServiceDefinitionByServiceInstance(
        serviceInstanceId
      );
    if (!serviceDefinition) {
      throw new Error(ErrorCode.ServiceDefinitionNotFound);
    }

    const [sourceDocumentFile] = await DocumentUploadsHelper.processUploads(
      sourceDocument,
      serviceInstanceId
    );
    const imagesFiles = await DocumentUploadsHelper.processUploads(
      images,
      serviceInstanceId
    );
    const [logoFile] = await DocumentUploadsHelper.processUploads(
      logo,
      serviceInstanceId
    );

    const documentMetadata: DocumentMetadataResolverType[] =
      DocumentHelper.buildCompleteMetadataFromDocumentFile({
        sourceDocumentFile,
        metadata,
      });

    if (input.entity_types != null) {
      documentMetadata.push({
        key: DocumentMetadataKeyCode.EntityTypes,
        value: JSON.stringify(input.entity_types),
      });
    }
    if (input.license_type != null) {
      documentMetadata.push({
        key: DocumentMetadataKeyCode.LicenseType,
        value: input.license_type,
      });
    }

    DocumentHelper.assertMetadataIsNotMissing(
      serviceDefinition.identifier as ManageableServiceDefinitionIdentifier,
      documentMetadata
    );

    const documentType =
      DocumentHelper.retrieveDocumentTypeFromServiceDefinition(
        serviceDefinition.identifier as ManageableServiceDefinitionIdentifier
      );

    DocumentHelper.assertDocumentFileIsNotMissing({
      hasDocument: !!sourceDocument,
      documentType,
      documentMetadata,
    });

    const isDocumentFileRequired = DocumentHelper.isDocumentFileRequired({
      documentType,
      documentMetadata,
    });

    const {
      entity_types: _entityTypes,
      license_type: _licenseType,
      ...documentColumnInput
    } = input;
    const documentData: DocumentData<Document> = {
      ...documentColumnInput,
      use_cases: input.use_cases ?? undefined,
      solution_categories: input.solution_categories ?? undefined,
      service_instance_id: serviceInstanceId,
      type: documentType,
      ...(sourceDocumentFile && isDocumentFileRequired
        ? {
            file_name: sourceDocumentFile.fileName,
            minio_name: sourceDocumentFile.minioName,
            mime_type: sourceDocumentFile.mimeType,
          }
        : {}),
    };

    const createdDocument = await withTransaction(async () => {
      const metadataKeys = documentMetadata.map(
        ({ key }) => key
      ) as DocumentMetadataKeys<Document>;
      const document = await DocumentDomain.createDocument(
        documentData,
        metadataKeys
      );

      if (documentMetadata.length) {
        await DocumentMetadataDomain.insertMetadataFromKeyValue(
          document.id,
          documentMetadata
        );

        for (const meta of documentMetadata) {
          setDocumentMetadataValue(document, meta.key, meta.value);
        }
      }

      await DocumentChildrenDomain.createImageDocuments(
        document.id,
        serviceInstanceId,
        imagesFiles,
        DocumentImageType.Image
      );

      if (logoFile) {
        await DocumentChildrenDomain.createImageDocuments(
          document.id,
          serviceInstanceId,
          [logoFile],
          DocumentImageType.Logo
        );
      }

      if (documentData.use_cases?.length) {
        await objectUseCaseDomain.insertObjectUseCase(
          documentData.use_cases.map((id) => ({
            object_id: toObjectUseCaseObjectId(document.id),
            use_case_id: id,
          }))
        );
      }

      if (input.solution_categories?.length) {
        await objectSolutionCategoryDomain.insertObjectSolutionCategory(
          input.solution_categories.map((solutionCategoryId) => ({
            object_id: toObjectSolutionCategoryObjectId(document.id),
            solution_category_id: solutionCategoryId,
          }))
        );
      }

      return document;
    });

    try {
      const createEvent =
        await TelemetryHelper.buildCreateEvent(createdDocument);
      await TelemetryApp.sendTelemetryEvent(createEvent);
    } catch (error) {
      logApp.error('Unable to send telemetry event for document creation', {
        error,
        documentId: createdDocument.id,
      });
    }

    void NewsFeedApp.upsertResourceNewsFeed({
      documentBeforeUpdate: undefined,
      updatedDocument: createdDocument,
      serviceDefinitionIdentifier: serviceDefinition.identifier,
    });

    return createdDocument;
  },

  updateDocument: async ({
    parentDocumentId,
    serviceInstanceId,
    metadata,
    sourceDocument,
    existingImageIds,
    input,
    images,
    logo,
  }: {
    parentDocumentId: DocumentId;
    serviceInstanceId: ServiceInstanceId;
    metadata: DocumentMetadataResolverType[];
    sourceDocument?: Upload;
    existingImageIds: DocumentId[];
    logo?: Upload;
    images?: Upload[];
    input: MutationUpdateDocumentArgsResolverType['input'];
  }) => {
    const serviceDefinition =
      await ServiceDefinitionDomain.loadServiceDefinitionByServiceInstance(
        serviceInstanceId
      );
    if (!serviceDefinition) {
      throw new Error(ErrorCode.ServiceDefinitionNotFound);
    }

    const documentBeforeUpdate = await DocumentDomain.loadDocumentBy({
      id: parentDocumentId,
    });

    if (!documentBeforeUpdate) {
      throw new Error(ErrorCode.DocumentNotFound);
    }

    if (documentBeforeUpdate.service_instance_id !== serviceInstanceId) {
      throw new Error(ErrorCode.DocumentNotFound);
    }

    const documentType =
      DocumentHelper.retrieveDocumentTypeFromServiceDefinition(
        serviceDefinition.identifier as ManageableServiceDefinitionIdentifier
      );
    const [sourceDocumentFile] = await DocumentUploadsHelper.processUploads(
      sourceDocument,
      serviceInstanceId
    );
    const imagesFiles = await DocumentUploadsHelper.processUploads(
      images,
      serviceInstanceId
    );
    const [logoFile] = await DocumentUploadsHelper.processUploads(
      logo,
      serviceInstanceId
    );

    let documentMetadata = DocumentHelper.buildCompleteMetadataFromDocumentFile(
      {
        sourceDocumentFile,
        metadata,
      }
    );

    if (
      !documentMetadata.some(
        ({ key }) => key === DocumentMetadataKeyCode.FeedUrl
      )
    ) {
      const existingFeedUrl =
        await DocumentMetadataDomain.loadMetadataValueByKey(
          parentDocumentId,
          DocumentMetadataKeyCode.FeedUrl
        );
      if (existingFeedUrl) {
        documentMetadata = [
          ...documentMetadata,
          { key: DocumentMetadataKeyCode.FeedUrl, value: existingFeedUrl },
        ];
      }
    }

    // entity_types is multi-valued: serialize it as a JSON metadata entry so it is
    // persisted in Document_Metadata (and stripped from the Document column update below).
    if (input.entity_types != null) {
      documentMetadata = [
        ...documentMetadata,
        {
          key: DocumentMetadataKeyCode.EntityTypes,
          value: JSON.stringify(input.entity_types),
        },
      ];
    }
    if (input.license_type != null) {
      documentMetadata = [
        ...documentMetadata,
        {
          key: DocumentMetadataKeyCode.LicenseType,
          value: input.license_type,
        },
      ];
    }

    DocumentHelper.assertMetadataIsNotMissing(
      serviceDefinition.identifier as ManageableServiceDefinitionIdentifier,
      documentMetadata
    );

    const updatedDocument = await withTransaction(async () => {
      const user = requestContext.requireUser();
      const uploader_organization_id = input.uploader_organization_id ?? null;
      const uploader_id = input.uploader_id ?? user.id;

      const file = DocumentHelper.isDocumentFileRequired({
        documentType,
        documentMetadata,
      })
        ? sourceDocumentFile
        : undefined;

      // entity_types and license_type are persisted as metadata (see above), not as Document columns.
      const {
        entity_types: _entityTypes,
        license_type: _licenseType,
        ...documentColumnData
      } = input;
      const doc = await DocumentDomain.updateDocument({
        parentDocumentId,
        document: {
          data: documentColumnData,
          file,
          type: documentType,
        },
        uploader_organization_id,
        uploader_id,
      });

      if (!doc) {
        throw new Error(UnknownErrorCode.DocumentUpdateError);
      }

      // If use_cases is null => that mean we want to update the field to empty
      if (input.use_cases !== undefined) {
        await objectUseCaseDomain.deleteObjectUseCaseBy({
          object_id: toObjectUseCaseObjectId(parentDocumentId),
        });

        if (input.use_cases && input.use_cases.length > 0) {
          await objectUseCaseDomain.insertObjectUseCase(
            input.use_cases.map((id) => ({
              object_id: toObjectUseCaseObjectId(parentDocumentId),
              use_case_id: id,
            }))
          );
        }
      }

      if (input.solution_categories?.length) {
        await objectSolutionCategoryDomain.deleteObjectSolutionCategoryBy({
          object_id: toObjectSolutionCategoryObjectId(parentDocumentId),
        });
        await objectSolutionCategoryDomain.insertObjectSolutionCategory(
          input.solution_categories.map((solutionCategoryId) => ({
            object_id: toObjectSolutionCategoryObjectId(parentDocumentId),
            solution_category_id: solutionCategoryId as SolutionCategoryId,
          }))
        );
      }

      if (documentMetadata.length) {
        await DocumentMetadataDomain.deleteMetadata({ id: parentDocumentId });
        await DocumentMetadataDomain.insertMetadataFromKeyValue(
          doc.id,
          documentMetadata
        );

        for (const meta of documentMetadata) {
          setDocumentMetadataValue(
            doc,
            meta.key,
            BOOLEAN_METADATA.includes(meta.key)
              ? meta.value === 'true'
              : meta.value
          );
        }
      }

      // Delete the images that are not in the existingImages array
      const childIds = await DocumentChildrenDomain.loadChildrenIds(
        parentDocumentId,
        existingImageIds
      );
      if (childIds.length > 0) {
        await DocumentDomain.deleteDocuments(childIds);
      }

      await DocumentChildrenDomain.createImageDocuments(
        parentDocumentId,
        serviceInstanceId,
        imagesFiles,
        DocumentImageType.Image
      );

      if (logoFile) {
        await DocumentChildrenDomain.createImageDocuments(
          parentDocumentId,
          serviceInstanceId,
          [logoFile],
          DocumentImageType.Logo
        );
      }

      return doc;
    });

    void NewsFeedApp.upsertResourceNewsFeed({
      documentBeforeUpdate,
      updatedDocument,
      serviceDefinitionIdentifier: serviceDefinition.identifier,
    });

    return updatedDocument;
  },

  createDocumentWithChildrenAndMetadata: async <T extends DocumentModel>(
    documentData: DocumentData<T, string>,
    metadataKeys: DocumentMetadataKeys<T> = []
  ): Promise<T> => {
    return await withTransaction(async () => {
      const document = await DocumentDomain.createDocument(
        documentData,
        metadataKeys
      );

      if (documentData.parent_document_id) {
        await DocumentChildrenDomain.insertChildRelationship({
          parentDocumentId: documentData.parent_document_id,
          childDocumentId: document.id,
        });
      }

      if (documentData.use_cases?.length) {
        await useCaseApp.linkUseCasesByNameToObject(
          toObjectUseCaseObjectId(document.id),
          documentData.use_cases
        );
      }

      if (metadataKeys.length) {
        const metadatas = await DocumentMetadataDomain.insertMetadata(
          document.id,
          documentData,
          metadataKeys
        );

        for (const metadata of metadatas) {
          setDocumentMetadataValue(document, metadata.key, metadata.value);
        }
      }

      return document as T;
    });
  },

  upsertDocumentWithExternalImage: async <T extends DocumentModel>(
    type: string,
    input: DocumentData<T, string>,
    externalImageUpload: Upload,
    metadataKeys: DocumentMetadataKeys<T>,
    product: FiligranProduct
  ) => {
    return withTransaction(async () => {
      const doc = await upsertDocument<T>(
        {
          ...input,
          type,
        },
        metadataKeys,
        product
      );

      await DocumentChildrenDomain.upsertExternalImage(
        doc,
        externalImageUpload
      );

      return doc;
    });
  },

  deleteDocument: async <T extends DocumentModel>(
    documentId: DocumentId,
    serviceInstanceId: ServiceInstanceId,
    hardDelete: boolean
  ): Promise<T> => {
    const documentFromDb = await DocumentDomain.loadDocumentBy({
      id: documentId,
      service_instance_id: serviceInstanceId,
    });

    if (!documentFromDb) {
      throw new Error('Document not found');
    }

    const childIds = await DocumentChildrenDomain.loadChildrenIds(documentId);
    if (hardDelete) {
      // Get all minio_name before their deletion
      const childrenDocumentFromDB = (
        await Promise.all(
          childIds.map((id) => DocumentDomain.loadDocumentBy({ id }))
        )
      ).filter(
        (childDocument): childDocument is DocumentModel =>
          childDocument !== undefined
      );
      await withTransaction(async () => {
        await DocumentChildrenDomain.deleteChildrenByParent(documentId);

        await DocumentDomain.deleteDocuments([...childIds, documentId]);

        // Use Cases
        await objectUseCaseDomain.deleteObjectUseCaseBy({
          object_id: toObjectUseCaseObjectId(documentId),
        });
      });
      await DocumentHelper.deleteFileFromMinIO(
        childrenDocumentFromDB,
        documentFromDb
      );
      return documentFromDb as T;
    }

    // Soft delete => desactivate the document
    await DocumentDomain.deactivateDocuments([documentId, ...childIds]);

    return documentFromDb as T;
  },

  loadDocuments: async (input: QueryDocumentsArgs) => {
    const serviceDefinition =
      await ServiceDefinitionDomain.loadServiceDefinitionByServiceInstance(
        input.serviceInstanceId
      );
    if (!serviceDefinition) {
      throw new Error(ErrorCode.ServiceDefinitionNotFound);
    }

    const { documentType, metadataKeys } =
      getMetadataKeysAndDocumentTypeFromServiceDefinition(serviceDefinition);

    return DocumentDomain.loadParentDocumentsByServiceInstance(
      documentType,
      input,
      metadataKeys
    );
  },

  loadPublicDocumentsByServiceSlug: async (
    serviceInstanceSlug: string
  ): Promise<Document[]> => {
    const serviceDefinition =
      await ServiceDefinitionDomain.loadServiceDefinitionByServiceInstanceSlug(
        serviceInstanceSlug
      );
    if (!serviceDefinition) {
      throw new Error(ErrorCode.ServiceDefinitionNotFound);
    }

    const { documentType, metadataKeys } =
      getMetadataKeysAndDocumentTypeFromServiceDefinition(serviceDefinition);

    return DocumentDomain.loadSeoDocumentsByServiceSlug(
      documentType,
      serviceInstanceSlug,
      metadataKeys
    );
  },

  loadPublicDocumentBySlug: async (
    serviceInstanceId: ServiceInstanceId,
    slug: string
  ) => {
    const serviceDefinition =
      await ServiceDefinitionDomain.loadServiceDefinitionByServiceInstance(
        serviceInstanceId
      );
    if (!serviceDefinition) {
      throw new Error(ErrorCode.ServiceDefinitionNotFound);
    }

    const { documentType, metadataKeys } =
      getMetadataKeysAndDocumentTypeFromServiceDefinition(serviceDefinition);

    return DocumentHelper.loadSeoDocumentWithCountersBySlug(
      documentType,
      slug,
      metadataKeys
    );
  },

  loadPublicDocuments: async (input: QueryPublicDocumentsArgs) => {
    const serviceDefinition =
      await ServiceDefinitionDomain.loadServiceDefinitionByServiceInstance(
        input.serviceInstanceId
      );
    if (!serviceDefinition) {
      throw new Error(ErrorCode.ServiceDefinitionNotFound);
    }
    const serviceDefinitionIdentifier =
      serviceDefinition.identifier as ManageableServiceDefinitionIdentifier;

    const metadataKeys = DocumentHelper.getMetadataKeysForServiceDefinition(
      serviceDefinitionIdentifier
    );

    const documentType =
      DocumentHelper.retrieveDocumentTypeFromServiceDefinition(
        serviceDefinitionIdentifier
      );

    const { slug, ...opts } = input;

    return DocumentDomain.loadPaginatedSeoDocumentsByServiceSlug(
      documentType,
      slug,
      opts,
      metadataKeys
    );
  },

  loadMostDeployedDocuments: async (
    limit: number,
    platformIdentifiers?: PlatformIdentifier[]
  ) => {
    const allShareableIdentifiers = [
      ...ServiceDefinitionIdentifiersByPlatformIdentifier.values(),
    ].flat();

    const serviceDefinitionIdentifiers = platformIdentifiers?.length
      ? platformIdentifiers.flatMap(
          (p) => ServiceDefinitionIdentifiersByPlatformIdentifier.get(p) ?? []
        )
      : allShareableIdentifiers;

    const documentTypes = serviceDefinitionIdentifiers.map(
      (identifier) => DocumentTypeMappedByServiceDefinition[identifier]
    );

    return DocumentDomain.loadMostDeployedDocuments(
      limit,
      ALL_METADATA_KEYS,
      documentTypes
    );
  },

  loadNewestDocuments: async (
    limit: number,
    platformIdentifiers?: PlatformIdentifier[]
  ) => {
    const NEWEST_DOCUMENTS_MAX_LIMIT = 20;

    // Default to all shareable service definitions so that non-shareable
    // types (e.g. vault, service_picture) are never exposed when no platform
    // filter is provided.
    const allShareableIdentifiers = [
      ...ServiceDefinitionIdentifiersByPlatformIdentifier.values(),
    ].flat();

    const serviceDefinitionIdentifiers = platformIdentifiers?.length
      ? platformIdentifiers.flatMap(
          (p) => ServiceDefinitionIdentifiersByPlatformIdentifier.get(p) ?? []
        )
      : allShareableIdentifiers;

    const documentTypes = serviceDefinitionIdentifiers.map(
      (identifier) => DocumentTypeMappedByServiceDefinition[identifier]
    );

    return DocumentDomain.loadNewestDocuments(
      Math.min(limit, NEWEST_DOCUMENTS_MAX_LIMIT),
      ALL_METADATA_KEYS,
      documentTypes
    );
  },

  loadLastDeployedOverview: async (
    limit: number,
    serviceInstanceId: ServiceInstanceId
  ) => {
    const platform =
      await RegistrationApp.loadRegisteredPlatform(serviceInstanceId);
    if (!platform) {
      throw ForbiddenAccess(ErrorCode.PlatformNotRegistered);
    }
    const deployments = await TelemetryApp.getLastDeployments(
      platform.platform_id,
      platform.tenant_id ?? null,
      limit
    );

    if (deployments.length === 0) {
      return { resources: [] };
    }

    const uniqueResourceIds = [
      ...new Set(deployments.map((deployment) => deployment.resource_id)),
    ];

    const documents = await DocumentDomain.loadDocumentsWithMetadataByIds(
      uniqueResourceIds,
      ALL_METADATA_KEYS
    );
    const documentById = new Map(documents.map((d) => [d.id as string, d]));

    const resources = deployments.flatMap((deployment) => {
      const document = documentById.get(deployment.resource_id);
      if (!document) {
        return [];
      }
      return [
        {
          document,
          deployedAt: deployment.deployed_at,
          deployedById: deployment.user_id,
        },
      ];
    });

    return { resources };
  },

  loadDocument: async (documentId: DocumentId) => {
    return DocumentHelper.loadDocumentWithCountersById(
      documentId,
      ALL_METADATA_KEYS
    );
  },
};

const upsertDocument = async <T extends DocumentModel>(
  documentData: DocumentData<T, string>,
  metadataKeys: DocumentMetadataKeys<T>,
  product: FiligranProduct
): Promise<T> => {
  return await withTransaction(async () => {
    // Prepare the data to insert
    const document = await DocumentDomain.upsertOnSlug(
      documentData,
      metadataKeys
    );

    const documentWasUpdated = !!document.updated_at;

    // Handle parent document relationship
    if (documentData.parent_document_id) {
      // First, delete existing relationship if it exists (for upsert scenario)
      if (documentWasUpdated) {
        await DocumentChildrenDomain.deleteChild(document.id);
      }

      // Insert new relationship
      await DocumentChildrenDomain.insertChildRelationship({
        parentDocumentId: documentData.parent_document_id,
        childDocumentId: document.id,
      });
    }

    if (documentData.use_cases?.length) {
      if (documentWasUpdated) {
        await objectUseCaseDomain.deleteObjectUseCaseBy({
          object_id: toObjectUseCaseObjectId(document.id),
        });
      }
      await useCaseApp.linkUseCasesByNameToObject(
        toObjectUseCaseObjectId(document.id),
        documentData.use_cases
      );
    }

    if (documentData.solution_categories !== undefined) {
      if (documentWasUpdated) {
        await objectSolutionCategoryDomain.deleteObjectSolutionCategoryBy({
          object_id: toObjectSolutionCategoryObjectId(document.id),
        });
      }
      await solutionCategoryApp.linkSolutionCategoriesByNameToObject({
        objectId: toObjectSolutionCategoryObjectId(document.id),
        names: documentData.solution_categories,
        product,
      });
    }

    if (metadataKeys.length > 0) {
      // If document was updated (not created)
      if (documentWasUpdated) {
        // Delete all existing metadata except 'version'
        await DocumentMetadataDomain.deleteMetadata({
          id: document.id,
          excludedKeys: [DocumentMetadataKeyCode.ProductVersion],
        });
        const existingVersion = await DocumentMetadataDomain.loadProductVersion(
          document.id
        );
        if (existingVersion) {
          setDocumentMetadataValue(
            document,
            DocumentMetadataKeyCode.ProductVersion,
            existingVersion
          );
        }
      }

      // Insert new metadata (excluding version) if documentWasUpdated
      const metadataKeysWithoutProductVersion = metadataKeys.filter(
        (key) =>
          key !== DocumentMetadataKeyCode.ProductVersion || !documentWasUpdated
      );

      const metadatas = await DocumentMetadataDomain.insertMetadata(
        document.id,
        documentData,
        metadataKeysWithoutProductVersion
      );

      for (const metadata of metadatas) {
        setDocumentMetadataValue(document, metadata.key, metadata.value);
      }
    }

    return document as T;
  });
};

const getMetadataKeysAndDocumentTypeFromServiceDefinition = (
  serviceDefinition: ServiceDefinition
): { documentType: DOCUMENT_TYPE; metadataKeys: DocumentMetadataKeyCode[] } => {
  const serviceDefinitionIdentifier =
    serviceDefinition.identifier as ManageableServiceDefinitionIdentifier;

  const metadataKeys = DocumentHelper.getMetadataKeysForServiceDefinition(
    serviceDefinitionIdentifier
  );

  const documentType = DocumentHelper.retrieveDocumentTypeFromServiceDefinition(
    serviceDefinitionIdentifier
  );

  return {
    documentType,
    metadataKeys,
  };
};
