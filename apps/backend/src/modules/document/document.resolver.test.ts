import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
  SERVICES,
} from '../../../tests/tests.const';
import {
  DocumentResolvers,
  IntegrationType,
  MutationCreateDocumentArgs,
  MutationUpdateDocumentArgs,
  Organization,
  PlatformIdentifier,
  QueryDocumentsArgs,
  QueryPublicDocumentsArgs,
  SubscriptionModel,
} from '../../__generated__/resolvers-types';
import DocumentModel, { DocumentId } from '../../model/kanel/public/Document';
import ServiceInstance from '../../model/kanel/public/ServiceInstance';
import UseCase from '../../model/kanel/public/UseCase';
import User from '../../model/kanel/public/User';
import {
  BadRequestErrorCode,
  ForbiddenErrorCode,
  NotFoundErrorCode,
} from '../../utils/error/error.code';
import { ErrorType } from '../../utils/error/error.type';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';
import { OPENAEV_SCENARIO_DOCUMENT_TYPE } from '../shareable-resource/openaev/scenario/scenario.model';
import { OPENCTI_CUSTOM_DASHBOARD_DOCUMENT_TYPE } from '../shareable-resource/opencti/custom-dashboard/custom-dashboard.model';
import { OPENCTI_INTEGRATION_DOCUMENT_TYPE } from '../shareable-resource/opencti/integration/integration.model';
import { DocumentApp } from './document.app';
import { subscriptionByServiceInstanceLoaderKey } from './document.dataloader';
import { DocumentHelper } from './document.helper';
import documentResolver from './document.resolver';
import { DocumentDomain } from './domain/document.domain';

describe('create document GraphQL mutation', () => {
  it('should delegate to DocumentApp.createDocument and return result', async () => {
    const serviceInstanceId = SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID;
    const expected = { id: uuidv4() as DocumentId } as unknown as Awaited<
      ReturnType<typeof DocumentApp.createDocument>
    >;
    vi.spyOn(DocumentApp, 'createDocument').mockResolvedValue(expected);

    const result = await documentResolver.Mutation!.createDocument!(
      {},
      { serviceInstanceId, input: {} } as unknown as MutationCreateDocumentArgs,
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(result).toEqual(expected);
  });

  it('should throw AlreadyExists when slug constraint is violated', async () => {
    vi.spyOn(DocumentApp, 'createDocument').mockRejectedValue(
      new Error('document_type_slug_unique constraint violated')
    );

    const call = documentResolver.Mutation!.createDocument!(
      {},
      {
        serviceInstanceId: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
        input: {},
      } as unknown as MutationCreateDocumentArgs,
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    await expect(call).rejects.toMatchObject({ name: ErrorType.AlreadyExists });
  });

  it('should map to BadRequest for DocumentFileMissing error', async () => {
    vi.spyOn(DocumentApp, 'createDocument').mockRejectedValue(
      new Error(BadRequestErrorCode.DocumentFileMissing)
    );

    const call = documentResolver.Mutation!.createDocument!(
      {},
      {
        serviceInstanceId: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
        input: {},
      } as unknown as MutationCreateDocumentArgs,
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    await expect(call).rejects.toMatchObject({ name: ErrorType.BadRequest });
  });
});

describe('update document GraphQL mutation', () => {
  it('should delegate to DocumentApp.updateDocument', async () => {
    const docId = uuidv4() as DocumentId;
    const expected = { id: docId } as unknown as Awaited<
      ReturnType<typeof DocumentApp.updateDocument>
    >;
    vi.spyOn(DocumentApp, 'updateDocument').mockResolvedValue(expected);

    const result = await documentResolver.Mutation!.updateDocument!(
      {},
      {
        documentId: docId,
        serviceInstanceId: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
        existingImageIds: [],
        input: {},
      } as unknown as MutationUpdateDocumentArgs,
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(DocumentApp.updateDocument).toHaveBeenCalledWith(
      expect.objectContaining({ parentDocumentId: docId })
    );
    expect(result).toEqual(expected);
  });

  it('should throw AlreadyExists on slug unique violation', async () => {
    vi.spyOn(DocumentApp, 'updateDocument').mockRejectedValue(
      new Error('document_type_slug_unique')
    );

    const call = documentResolver.Mutation!.updateDocument!(
      {},
      {
        documentId: uuidv4(),
        serviceInstanceId: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
        existingImageIds: [],
        input: {},
      } as unknown as MutationUpdateDocumentArgs,
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    await expect(call).rejects.toMatchObject({ name: ErrorType.AlreadyExists });
  });

  it('should map to BadRequest for DocumentMissingMetadata error', async () => {
    vi.spyOn(DocumentApp, 'updateDocument').mockRejectedValue(
      new Error(BadRequestErrorCode.DocumentMissingMetadata)
    );

    const call = documentResolver.Mutation!.updateDocument!(
      {},
      {
        documentId: uuidv4(),
        serviceInstanceId: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
        existingImageIds: [],
        input: {},
      } as unknown as MutationUpdateDocumentArgs,
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    await expect(call).rejects.toMatchObject({ name: ErrorType.BadRequest });
  });
});

describe('delete document GraphQL mutation', () => {
  it('should delegate to DocumentApp.deleteDocument', async () => {
    const docId = uuidv4() as DocumentId;
    const expected = { id: docId } as unknown as Awaited<
      ReturnType<typeof DocumentApp.deleteDocument>
    >;
    vi.spyOn(DocumentApp, 'deleteDocument').mockResolvedValue(expected);

    const result = await documentResolver.Mutation!.deleteDocument!(
      {},
      {
        documentId: docId,
        service_instance_id: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
        forceDelete: false,
      },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(DocumentApp.deleteDocument).toHaveBeenCalledWith(
      docId,
      SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
      false
    );
    expect(result).toEqual(expected);
  });

  it('should map to NotFound for DocumentNotFound error', async () => {
    vi.spyOn(DocumentApp, 'deleteDocument').mockRejectedValue(
      new Error(NotFoundErrorCode.DocumentNotFound)
    );

    const call = documentResolver.Mutation!.deleteDocument!(
      {},
      {
        documentId: uuidv4() as DocumentId,
        service_instance_id: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
        forceDelete: false,
      },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    await expect(call).rejects.toMatchObject({ name: ErrorType.NotFound });
  });
});

describe('increment share number document GraphQL mutation', () => {
  it('should load document, update counters, and return result', async () => {
    const docId = uuidv4() as DocumentId;
    const doc = {
      id: docId,
      service_instance_id: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
      name: 'doc',
    } as unknown as Awaited<
      ReturnType<typeof DocumentDomain.loadDocumentWithMetadataById>
    >;
    const updated = { ...doc, share_number: 1 } as unknown as Awaited<
      ReturnType<typeof DocumentHelper.updateDocumentWithCounters>
    >;
    vi.spyOn(DocumentDomain, 'loadDocumentWithMetadataById').mockResolvedValue(
      doc
    );
    vi.spyOn(DocumentHelper, 'updateDocumentWithCounters').mockResolvedValue(
      updated
    );
    vi.spyOn(
      ServiceInstanceDomain,
      'loadServiceDefinitionByServiceInstance'
    ).mockRejectedValue(new Error('skip telemetry'));

    const result = await documentResolver.Mutation!
      .incrementShareNumberDocument!(
      {},
      { documentId: docId },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(result).toEqual(updated);
  });

  it('should map to ForbiddenAccess for ServiceNotManageable error', async () => {
    vi.spyOn(DocumentDomain, 'loadDocumentWithMetadataById').mockRejectedValue(
      new Error(ForbiddenErrorCode.ServiceNotManageable)
    );

    const call = documentResolver.Mutation!.incrementShareNumberDocument!(
      {},
      { documentId: uuidv4() as DocumentId },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    await expect(call).rejects.toMatchObject({
      name: ErrorType.ForbiddenAccess,
    });
  });
});

describe('document.__resolveType', () => {
  it.each`
    type                                      | expected
    ${OPENCTI_CUSTOM_DASHBOARD_DOCUMENT_TYPE} | ${'CustomDashboard'}
    ${OPENAEV_SCENARIO_DOCUMENT_TYPE}         | ${'OpenAEVScenario'}
  `(
    'should resolve $type to $expected without querying metadata',
    async ({ type, expected }) => {
      const doc = { id: uuidv4(), type } as unknown as DocumentModel;
      const result = await (
        documentResolver.Document as unknown as DocumentResolvers
      ).__resolveType(doc, contextSimpleUserFiligran2, GRAPHQL_RESOLVE_INFO);
      expect(result).toBe(expected);
    }
  );

  it.each`
    integrationType                          | expected
    ${IntegrationType.Connector}             | ${'Connector'}
    ${IntegrationType.CsvFeed}               | ${'CsvFeed'}
    ${IntegrationType.TaxiiFeed}             | ${'TaxiiFeed'}
    ${IntegrationType.RssFeed}               | ${'RssFeed'}
    ${IntegrationType.Stream}                | ${'Stream'}
    ${IntegrationType.ThirdPartyIntegration} | ${'ThirdPartyIntegration'}
  `(
    'should resolve integration document with type $integrationType to $expected',
    async ({ integrationType, expected }) => {
      const doc = {
        id: uuidv4(),
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
      } as unknown as DocumentModel;
      vi.spyOn(
        contextSimpleUserFiligran2.dataLoaders.document.integrationTypeLoader,
        'load'
      ).mockResolvedValue(integrationType);

      const result = await (
        documentResolver.Document as unknown as DocumentResolvers
      ).__resolveType(doc, contextSimpleUserFiligran2, GRAPHQL_RESOLVE_INFO);

      expect(result).toBe(expected);
    }
  );

  it('should return DefaultDocument for unrecognised type', async () => {
    const doc = {
      id: uuidv4(),
      type: 'unknown_type',
    } as unknown as DocumentModel;
    const result = await (
      documentResolver.Document as unknown as DocumentResolvers
    ).__resolveType(doc, contextSimpleUserFiligran2, GRAPHQL_RESOLVE_INFO);
    expect(result).toBe('DefaultDocument');
  });

  it('should resolve integration type from an already-hydrated document without querying the dataloader', async () => {
    // Given a document that already carries `integration_type` (e.g.
    // hydrated by DocumentMetadataDomain.hydrateMetadata upstream)
    const doc = {
      id: uuidv4(),
      type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
      integration_type: IntegrationType.Connector,
    } as unknown as DocumentModel;
    const loadSpy = vi.spyOn(
      contextSimpleUserFiligran2.dataLoaders.document.integrationTypeLoader,
      'load'
    );

    // When resolving its concrete GraphQL type
    const result = await (
      documentResolver.Document as unknown as DocumentResolvers
    ).__resolveType(doc, contextSimpleUserFiligran2, GRAPHQL_RESOLVE_INFO);

    // Then it resolves using the hydrated value, without a dataloader call
    expect(result).toBe('Connector');
    expect(loadSpy).not.toHaveBeenCalled();
  });
});

describe('document field resolvers', () => {
  it('children_documents should load children by document id', async () => {
    const id = uuidv4() as DocumentId;
    const expected = [{ id: uuidv4() }];
    vi.spyOn(
      contextSimpleUserFiligran2.dataLoaders.document.childrenDocumentsLoader,
      'load'
    ).mockResolvedValue(
      expected as unknown as Awaited<
        ReturnType<
          typeof contextSimpleUserFiligran2.dataLoaders.document.childrenDocumentsLoader.load
        >
      >
    );

    const result = await (
      documentResolver.Document as unknown as DocumentResolvers
    ).children_documents!(
      { id } as DocumentModel,
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(
      contextSimpleUserFiligran2.dataLoaders.document.childrenDocumentsLoader
        .load
    ).toHaveBeenCalledWith(id);
    expect(result).toEqual(expected);
  });

  it('use_cases should load use cases by document id', async () => {
    const id = uuidv4() as DocumentId;
    const expected = [{ id: uuidv4(), name: 'Use Case A' }];
    vi.spyOn(
      contextSimpleUserFiligran2.dataLoaders.document
        .useCasesByDocumentIdLoader,
      'load'
    ).mockResolvedValue(expected as unknown as UseCase[]);

    const result = await (
      documentResolver.Document as unknown as DocumentResolvers
    ).use_cases!(
      { id } as DocumentModel,
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(
      contextSimpleUserFiligran2.dataLoaders.document.useCasesByDocumentIdLoader
        .load
    ).toHaveBeenCalledWith(id);
    expect(result).toEqual(expected);
  });

  it('uploader should load uploader by document id', async () => {
    const id = uuidv4() as DocumentId;
    const expected = { id: uuidv4() } as unknown as User | null;
    vi.spyOn(
      contextSimpleUserFiligran2.dataLoaders.document.uploaderLoader,
      'load'
    ).mockResolvedValue(expected);

    const result = await (
      documentResolver.Document as unknown as DocumentResolvers
    ).uploader!(
      { id } as DocumentModel,
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(
      contextSimpleUserFiligran2.dataLoaders.document.uploaderLoader.load
    ).toHaveBeenCalledWith(id);
    expect(result).toEqual(expected);
  });

  it('uploader_organization should load uploader organization by document id', async () => {
    const id = uuidv4() as DocumentId;
    const expected = { id: uuidv4() } as unknown as Organization | null;
    vi.spyOn(
      contextSimpleUserFiligran2.dataLoaders.document
        .uploaderOrganizationLoader,
      'load'
    ).mockResolvedValue(expected);

    const result = await (
      documentResolver.Document as unknown as DocumentResolvers
    ).uploader_organization!(
      { id } as DocumentModel,
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(
      contextSimpleUserFiligran2.dataLoaders.document.uploaderOrganizationLoader
        .load
    ).toHaveBeenCalledWith(id);
    expect(result).toEqual(expected);
  });

  it('service_instance should load service instance by service_instance_id', async () => {
    const serviceInstanceId = SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID;
    const expected = { id: serviceInstanceId } as unknown as
      ServiceInstance | undefined;
    vi.spyOn(
      contextSimpleUserFiligran2.dataLoaders.document.serviceInstanceByIdLoader,
      'load'
    ).mockResolvedValue(expected as ServiceInstance | undefined);

    const result = await (
      documentResolver.Document as unknown as DocumentResolvers
    ).service_instance!(
      { service_instance_id: serviceInstanceId } as DocumentModel,
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(
      contextSimpleUserFiligran2.dataLoaders.document.serviceInstanceByIdLoader
        .load
    ).toHaveBeenCalledWith(serviceInstanceId);
    expect(result).toEqual(expected);
  });

  it('subscription should load subscription by service_instance_id and organization_id', async () => {
    const serviceInstanceId = SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID;
    const expected = { id: uuidv4() } as unknown as SubscriptionModel;
    vi.spyOn(
      contextSimpleUserFiligran2.dataLoaders.document
        .subscriptionByServiceInstanceLoader,
      'load'
    ).mockResolvedValue(expected);

    const result = await (
      documentResolver.Document as unknown as DocumentResolvers
    ).subscription!(
      { service_instance_id: serviceInstanceId } as DocumentModel,
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(
      contextSimpleUserFiligran2.dataLoaders.document
        .subscriptionByServiceInstanceLoader.load
    ).toHaveBeenCalledWith(
      subscriptionByServiceInstanceLoaderKey.create({
        organizationId:
          contextSimpleUserFiligran2.user.selected_organization_id,
        serviceInstanceId,
      })
    );
    expect(result).toEqual(expected);
  });
});

describe('document exists GraphQL query', () => {
  it('should delegate to checkDocumentExists and return result', async () => {
    vi.spyOn(DocumentHelper, 'checkDocumentExists').mockResolvedValue(false);

    const result = await documentResolver.Query!.documentExists!(
      {},
      {
        documentName: 'test.md',
        service_instance_id: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
      },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(DocumentHelper.checkDocumentExists).toHaveBeenCalledWith(
      'test.md',
      SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID
    );
    expect(result).toBe(false);
  });
});

describe('public documents GraphQL query', () => {
  it('should delegate to DocumentApp.loadPublicDocuments and return result', async () => {
    const expected = [] as unknown as Awaited<
      ReturnType<typeof DocumentApp.loadPublicDocuments>
    >;
    vi.spyOn(DocumentApp, 'loadPublicDocuments').mockResolvedValue(expected);

    const result = await documentResolver.Query!.publicDocuments!(
      {},
      {
        service_instance_id: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
      } as unknown as QueryPublicDocumentsArgs,
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(result).toEqual(expected);
  });
});

describe('public documents by service slug GraphQL query', () => {
  it('should delegate to DocumentApp.loadPublicDocumentsByServiceSlug and return result', async () => {
    const expected = [] as unknown as Awaited<
      ReturnType<typeof DocumentApp.loadPublicDocumentsByServiceSlug>
    >;
    vi.spyOn(DocumentApp, 'loadPublicDocumentsByServiceSlug').mockResolvedValue(
      expected
    );

    const result = await documentResolver.Query!.publicDocumentsByServiceSlug!(
      {},
      { serviceInstanceSlug: 'my-service' },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(DocumentApp.loadPublicDocumentsByServiceSlug).toHaveBeenCalledWith(
      'my-service'
    );
    expect(result).toEqual(expected);
  });
});

describe('public document by slug GraphQL query', () => {
  it('should delegate to DocumentApp.loadPublicDocumentBySlug and return result', async () => {
    const expected = { id: uuidv4() } as unknown as Awaited<
      ReturnType<typeof DocumentApp.loadPublicDocumentBySlug>
    >;
    vi.spyOn(DocumentApp, 'loadPublicDocumentBySlug').mockResolvedValue(
      expected
    );

    const result = await documentResolver.Query!.publicDocumentBySlug!(
      {},
      {
        serviceInstanceId: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
        slug: 'my-slug',
      },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(DocumentApp.loadPublicDocumentBySlug).toHaveBeenCalledWith(
      SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
      'my-slug'
    );
    expect(result).toEqual(expected);
  });
});

describe('documents GraphQL query', () => {
  it('should delegate to DocumentApp.loadDocuments and return result', async () => {
    const expected = [] as unknown as Awaited<
      ReturnType<typeof DocumentApp.loadDocuments>
    >;
    vi.spyOn(DocumentApp, 'loadDocuments').mockResolvedValue(expected);

    const result = await documentResolver.Query!.documents!(
      {},
      {
        service_instance_id: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
      } as unknown as QueryDocumentsArgs,
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(result).toEqual(expected);
  });
});

describe('document GraphQL query', () => {
  it('should delegate to DocumentApp.loadDocument', async () => {
    const docId = uuidv4() as DocumentId;
    const expected = { id: docId } as unknown as Awaited<
      ReturnType<typeof DocumentApp.loadDocument>
    >;
    vi.spyOn(DocumentApp, 'loadDocument').mockResolvedValue(expected);

    const result = await documentResolver.Query!.document!(
      {},
      {
        documentId: docId,
        serviceInstanceId: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
      },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(DocumentApp.loadDocument).toHaveBeenCalledWith(docId);
    expect(result).toEqual(expected);
  });
});

describe('mostDeployedDocuments GraphQL query', () => {
  it('should delegate to DocumentApp.loadMostDeployedDocuments and return result', async () => {
    const expected = [{ id: uuidv4() }, { id: uuidv4() }] as unknown as Awaited<
      ReturnType<typeof DocumentApp.loadMostDeployedDocuments>
    >;
    vi.spyOn(DocumentApp, 'loadMostDeployedDocuments').mockResolvedValue(
      expected
    );

    const result = await documentResolver.Query!.mostDeployedDocuments!(
      {},
      { limit: 2 },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(DocumentApp.loadMostDeployedDocuments).toHaveBeenCalledWith(
      2,
      undefined
    );
    expect(result).toEqual(expected);
  });

  it('should pass platformIdentifiers to DocumentApp.loadMostDeployedDocuments', async () => {
    const expected = [{ id: uuidv4() }] as unknown as Awaited<
      ReturnType<typeof DocumentApp.loadMostDeployedDocuments>
    >;
    vi.spyOn(DocumentApp, 'loadMostDeployedDocuments').mockResolvedValue(
      expected
    );

    const result = await documentResolver.Query!.mostDeployedDocuments!(
      {},
      { limit: 5, platformIdentifiers: [PlatformIdentifier.Opencti] },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(DocumentApp.loadMostDeployedDocuments).toHaveBeenCalledWith(5, [
      PlatformIdentifier.Opencti,
    ]);
    expect(result).toEqual(expected);
  });
});

describe('newestDocuments GraphQL query', () => {
  it('should delegate to DocumentApp.loadNewestDocuments and return result', async () => {
    const expected = [{ id: uuidv4() }, { id: uuidv4() }] as unknown as Awaited<
      ReturnType<typeof DocumentApp.loadNewestDocuments>
    >;
    vi.spyOn(DocumentApp, 'loadNewestDocuments').mockResolvedValue(expected);

    const result = await documentResolver.Query!.newestDocuments!(
      {},
      { limit: 5 },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(DocumentApp.loadNewestDocuments).toHaveBeenCalledWith(5, undefined);
    expect(result).toEqual(expected);
  });

  it('should pass platformIdentifiers to DocumentApp.loadNewestDocuments', async () => {
    const expected = [{ id: uuidv4() }] as unknown as Awaited<
      ReturnType<typeof DocumentApp.loadNewestDocuments>
    >;
    vi.spyOn(DocumentApp, 'loadNewestDocuments').mockResolvedValue(expected);

    const result = await documentResolver.Query!.newestDocuments!(
      {},
      { limit: 5, platformIdentifiers: [PlatformIdentifier.Opencti] },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(DocumentApp.loadNewestDocuments).toHaveBeenCalledWith(5, [
      PlatformIdentifier.Opencti,
    ]);
    expect(result).toEqual(expected);
  });
});
