import { Knex } from 'knex';
import { db, dbRaw, paginate } from '../../../../knexfile';
import {
  DocumentConnection,
  DocumentMetadataKeyCode,
  FeatureFlag,
  IntegrationType,
  Organization,
  QueryDocumentsArgs,
  UpdateDocumentInput,
} from '../../../__generated__/resolvers-types';
import { withTransaction } from '../../../context/database.context';
import {
  DocumentId,
  default as DocumentModel,
  DocumentMutator,
} from '../../../model/kanel/public/Document';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import User, { UserId } from '../../../model/kanel/public/User';
import { UnknownErrorCode } from '../../../utils/error/error.code';
import { isFeatureEnabled } from '../../../utils/feature-flag.util';
import { omit } from '../../../utils/utils';
import { isLtsVersion } from '../../../utils/versioning';
import {
  ConnectorV2,
  INTEGRATION_CONNECTOR_V2_METADATA_KEYS,
  OPENCTI_INTEGRATION_DOCUMENT_TYPE,
} from '../../shareable-resource/opencti/integration/integration.model';
import { Document, DOCUMENT_TYPE, WithDocumentId } from '../document.helper';

import { requestContext } from '../../../context/request.context';
import { OrganizationId } from '../../../model/kanel/public/Organization';
import { SolutionCategoryId } from '../../../model/kanel/public/SolutionCategory';
import type { UseCaseId } from '../../../model/kanel/public/UseCase';
import {
  PLATFORM_ORGANIZATION_UUID,
  SYSTEM_USER_UUID,
} from '../../../portal.const';
import {
  restrictDocumentToAccessibleServiceInstance,
  restrictDocumentToActive,
  restrictDocumentToPublicServiceInstance,
  restrictDocumentToUserOrganization,
} from '../../../security/restriction/document';
import { restrictServiceInstanceToPublic } from '../../../security/restriction/service-instance';
import { MinioFile } from '../../../thirdparty/minio/types';
import { stripNulls } from '../../../utils/typescript';
import {
  ManifestFragmentHelper,
  TAG_DECOUPLING,
  TAG_LATEST,
  TAG_LATEST_LTS,
} from '../../shareable-resource/manifest-fragment/manifest-fragment.helper';
import { isUserRestrictedToActiveDocument } from '../document.security';
import {
  DocumentMetadataDomain,
  DocumentMetadataKeys,
} from './document.metadata.domain';

type UseCaseValue = UseCaseId | string;
type SolutionCategoryValue = SolutionCategoryId | string;

// Hides documents tagged TAG_DECOUPLING. Tags are lowercase, so @> is a safe indexable
// replacement for ILIKE ANY.
const excludeDecouplingTag = (query: Knex.QueryBuilder) =>
  query.whereRaw(`NOT ("Document"."tags" @> ARRAY[?]::text[])`, [
    TAG_DECOUPLING,
  ]);

// Connectors: require TAG_LATEST + TAG_DECOUPLING. Non-connectors: fall back to
// excludeDecouplingTag. Gated by DECOUPLING_CONNECTORS.
const restrictConnectorsToLatestDecoupling = (query: Knex.QueryBuilder) =>
  query
    // LEFT JOIN instead of two EXISTS subqueries (one negated, one not): computes
    // "is connector" once per row. Safe from row duplication since (document_id, key)
    // is Document_Metadata's primary key, so at most one row matches per document.
    .leftJoin({ dm_integration_type: 'Document_Metadata' }, function () {
      this.on('dm_integration_type.document_id', '=', 'Document.id').andOnVal(
        'dm_integration_type.key',
        DocumentMetadataKeyCode.IntegrationType
      );
    })
    .where((outer) => {
      outer
        .where((nonConnectorBuilder) => {
          nonConnectorBuilder
            .whereRaw('"dm_integration_type"."value" IS DISTINCT FROM ?', [
              IntegrationType.Connector,
            ])
            .modify(excludeDecouplingTag);
        })
        .orWhere((connectorBuilder) => {
          connectorBuilder
            .where('dm_integration_type.value', IntegrationType.Connector)
            .whereRaw(`"Document"."tags" @> ARRAY[?, ?]::text[]`, [
              TAG_LATEST,
              TAG_DECOUPLING,
            ]);
        });
    });

// Applies DECOUPLING_CONNECTORS for queries scoped to a single document `type`.
const applyDecouplingRestriction =
  (type: string) => (query: Knex.QueryBuilder) => {
    if (
      type === OPENCTI_INTEGRATION_DOCUMENT_TYPE &&
      isFeatureEnabled(FeatureFlag.DecouplingConnectors)
    ) {
      restrictConnectorsToLatestDecoupling(query);
    } else {
      excludeDecouplingTag(query);
    }
  };

// Same as applyDecouplingRestriction, for mixed-type listings: no single `type` to
// check, connectors self-select via their Document_Metadata IntegrationType.
const applyDecouplingRestrictionForMixedTypes = (query: Knex.QueryBuilder) => {
  if (isFeatureEnabled(FeatureFlag.DecouplingConnectors)) {
    restrictConnectorsToLatestDecoupling(query);
  } else {
    excludeDecouplingTag(query);
  }
};

export type DocumentData<
  T extends DocumentModel,
  TUseCase extends UseCaseValue = UseCaseId,
  TSolutionCategory extends SolutionCategoryValue = SolutionCategoryId,
> = Omit<Partial<T>, 'use_cases'> & {
  use_cases?: TUseCase[];
  /** Single category id — form/drawer path, inserted directly as the FK. */
  solution_category?: TSolutionCategory;
  /**
   * Category names as shipped by the manifest (both ingestion paths speak
   * names; only the form path speaks ids), resolved at link time via
   * linkSolutionCategoriesByNameToObject. Deliberately not TSolutionCategory[]:
   * the ingestion instantiates DocumentData<T, string>, so the generic would
   * default to the branded SolutionCategoryId and reject the extracted strings.
   */
  solution_categories?: string[];
  parent_document_id?: DocumentId;
};

export const DocumentDomain = {
  reassignUserDocumentsToSystemUser: async (userId: UserId): Promise<void> => {
    return withTransaction(async () => {
      await db<DocumentModel>('Document')
        .where('uploader_id', '=', userId)
        .update({
          uploader_id: SYSTEM_USER_UUID,
          uploader_organization_id: PLATFORM_ORGANIZATION_UUID,
        });

      await db<DocumentModel>('Document')
        .where('remover_id', '=', userId)
        .update({ remover_id: SYSTEM_USER_UUID });

      await db<DocumentModel>('Document')
        .where('updater_id', '=', userId)
        .update({ updater_id: SYSTEM_USER_UUID });
    });
  },

  deactivateDocuments: async (documentIds: DocumentId[]) => {
    const user = requestContext.requireUser();

    await db<Document>('Document')
      .whereIn('id', documentIds)
      .update({ active: false, remover_id: user.id });
  },

  createDocument: async <
    T extends DocumentModel,
    TUseCase extends UseCaseValue = UseCaseId,
  >(
    documentData: DocumentData<T, TUseCase>,
    metadataKeys: DocumentMetadataKeys<T>
  ): Promise<DocumentModel> => {
    const user = requestContext.requireUser();
    const uploader_id = documentData.uploader_id ?? user.id;
    const [document] = await db<DocumentModel>('Document')
      .insert({
        ...omit(documentData, [
          'parent_document_id',
          'use_cases',
          'solution_categories',
          ...metadataKeys,
        ]),
        active: documentData.active ?? true,
        uploader_id,
        uploader_organization_id: user.selected_organization_id,
      })
      .returning('*');

    if (!document) {
      throw new Error(UnknownErrorCode.DocumentCreateError);
    }
    return document as T;
  },

  loadDocumentBy: async (
    field: DocumentMutator
  ): Promise<DocumentModel | undefined> => {
    return db<DocumentModel>('Document')
      .where(field)
      .select('Document.*')
      .first();
  },

  loadDocumentWithMetadataById: async <T extends Document>(
    id: string,
    include_metadata: DocumentMetadataKeyCode[] = []
  ): Promise<T> => {
    const document = await db<T>('Document')
      .where('Document.id', '=', id)
      .select('Document.*')
      .first();

    return DocumentMetadataDomain.hydrateMetadataOne(
      document,
      include_metadata
    );
  },

  loadDocumentsWithMetadataByIds: async <T extends Document>(
    ids: string[],
    include_metadata: DocumentMetadataKeyCode[] = []
  ): Promise<T[]> => {
    if (ids.length === 0) return [];

    const documents = (await db<T>('Document')
      .whereIn('Document.id', ids)
      .select('Document.*')) as T[];

    return DocumentMetadataDomain.hydrateMetadata(documents, include_metadata);
  },

  lockDocumentsBySlugTypeAndServiceInstance: async ({
    slug,
    type,
    serviceInstanceId,
  }: {
    slug: string;
    type: string;
    serviceInstanceId: ServiceInstanceId;
  }): Promise<Pick<DocumentModel, 'id'>[]> => {
    return db<DocumentModel>('Document')
      .where({
        slug,
        type,
        service_instance_id: serviceInstanceId,
      })
      .select('id')
      .forUpdate();
  },

  loadDocumentsByMetadata: async (
    key: string,
    value: string,
    include_metadata: DocumentMetadataKeyCode[] = [],
    documentFilters: DocumentMutator = {}
  ): Promise<DocumentModel[]> => {
    const { tags, ...scalarFilters } = documentFilters;

    const docQuery = db<DocumentModel>('Document')
      .leftJoin(
        'Document_Metadata',
        'Document.id',
        'Document_Metadata.document_id'
      )
      .where('Document_Metadata.key', key)
      .andWhere('Document_Metadata.value', value)
      .andWhere(scalarFilters)
      .select('Document.*')
      .groupBy('Document.id');

    if (tags && tags.length > 0) {
      const placeholders = tags.map(() => '?').join(',');
      docQuery.whereRaw(
        `"Document"."tags"::text[] @> array[${placeholders}]`,
        tags
      );
    }

    const documents: DocumentModel[] = await docQuery;

    return DocumentMetadataDomain.hydrateMetadata(documents, include_metadata);
  },

  buildUploaderQuery: (documentIds: readonly string[]) => {
    return db<WithDocumentId<User>>('User')
      .leftJoin('Document', 'Document.uploader_id', 'User.id')
      .whereIn('Document.id', documentIds)
      .select('User.*', 'Document.id as _document_id');
  },

  loadUploader: async (
    documentId: string
  ): Promise<WithDocumentId<User> | undefined> => {
    const rows = await DocumentDomain.buildUploaderQuery([documentId]);
    return rows[0];
  },

  buildUploaderOrganizationQuery: (documentIds: readonly string[]) => {
    return db<WithDocumentId<Organization>>('Organization')
      .leftJoin(
        'Document',
        'Document.uploader_organization_id',
        'Organization.id'
      )
      .whereIn('Document.id', documentIds)
      .select('Organization.*', 'Document.id as _document_id');
  },

  loadUploaderOrganization: async (
    documentId: string
  ): Promise<WithDocumentId<Organization> | undefined> => {
    const rows = await DocumentDomain.buildUploaderOrganizationQuery([
      documentId,
    ]);
    return rows[0];
  },

  loadParentDocumentsByServiceInstance: async (
    type: string,
    input: QueryDocumentsArgs,
    include_metadata?: DocumentMetadataKeyCode[]
  ): Promise<DocumentConnection> => {
    return DocumentDomain.loadDocuments(
      {
        ...input,
        parentsOnly: input.parentsOnly ?? true,
        searchTerm: input.searchTerm,
      },
      {
        'Document.service_instance_id': input.serviceInstanceId,
        'Document.type': type,
      },
      include_metadata
    );
  },

  loadDocuments: async (
    opts: Partial<QueryDocumentsArgs>,
    field: Record<string, unknown>,
    include_metadata?: DocumentMetadataKeyCode[]
  ): Promise<DocumentConnection> => {
    const user = requestContext.requireUser();

    const loadDocumentQuery = db<Document>('Document')
      .select(['Document.*'])
      .tap(restrictDocumentToUserOrganization)
      .tap(restrictDocumentToAccessibleServiceInstance)
      .where(field)
      .modify(applyDecouplingRestriction(field['Document.type'] as string));

    if (
      field['Document.service_instance_id'] &&
      (await isUserRestrictedToActiveDocument(
        user,
        field['Document.service_instance_id'] as ServiceInstanceId
      ))
    ) {
      loadDocumentQuery.tap(restrictDocumentToActive);
    }

    if (opts.parentsOnly) {
      // Using the Document_Children table to filter for parent documents (those that have children)
      loadDocumentQuery.whereNotExists(function () {
        this.select(dbRaw('1'))
          .from('Document_Children')
          .whereRaw(
            '"Document_Children"."child_document_id" = "Document"."id"'
          );
      });
    }

    loadDocumentQuery.groupBy(['Document.id']);

    const connection = await paginate<Document, DocumentConnection>(
      'Document',
      opts,
      { normalizeSearchTerm: true },
      loadDocumentQuery
    );

    const hydratedNodes = await DocumentMetadataDomain.hydrateMetadata(
      connection.edges.map(({ node }) => node),
      include_metadata
    );

    return {
      ...connection,
      edges: connection.edges.map((edge, index) => ({
        ...edge,
        node: hydratedNodes[index] as Document,
      })),
    };
  },

  loadSeoDocumentBySlug: async (
    type: string,
    slug: string,
    include_metadata: DocumentMetadataKeyCode[] = []
  ) => {
    const document = await db<Document>('Document')
      .select('Document.*')
      .where('Document.slug', '=', slug)
      .where('Document.active', '=', true)
      .where('Document.type', '=', type)
      .modify(applyDecouplingRestriction(type))
      .tap(restrictDocumentToPublicServiceInstance)
      .whereNotExists(function () {
        this.select('*')
          .from('Document_Children')
          .whereRaw(
            '"Document_Children"."child_document_id" = "Document"."id"'
          );
      })
      .groupBy(['Document.id'])
      .first();

    return DocumentMetadataDomain.hydrateMetadataOne(
      document,
      include_metadata
    );
  },

  loadPaginatedSeoDocumentsByServiceSlug: async (
    type: string,
    serviceSlug: string,
    opts: Partial<QueryDocumentsArgs>,
    include_metadata?: DocumentMetadataKeyCode[]
  ) => {
    const useDefaultSort = !opts.orderBy;
    const loadDocumentsQuery =
      DocumentDomain.buildSeoDocumentsByServiceSlugQuery(
        type,
        serviceSlug,
        useDefaultSort
      );

    const connection = await paginate<Document, DocumentConnection>(
      'Document',
      opts,
      opts,
      loadDocumentsQuery
    );

    const hydratedNodes = await DocumentMetadataDomain.hydrateMetadata(
      connection.edges.map(({ node }) => node),
      include_metadata
    );

    return {
      ...connection,
      edges: connection.edges.map((edge, index) => ({
        ...edge,
        node: hydratedNodes[index] as Document,
      })),
    };
  },

  buildSeoDocumentsByServiceSlugQuery: (
    type: string,
    serviceSlug: string,
    orderResults: boolean = true
  ): Knex.QueryBuilder => {
    return db<Document>('Document')
      .select('Document.*')
      .leftJoin(
        'ServiceInstance',
        'Document.service_instance_id',
        'ServiceInstance.id'
      )
      .whereNotExists(function () {
        this.select(dbRaw('1'))
          .from('Document_Children')
          .whereRaw(
            '"Document_Children"."child_document_id" = "Document"."id"'
          );
      })
      .where('ServiceInstance.slug', '=', serviceSlug)
      .tap(restrictServiceInstanceToPublic)
      .where('Document.active', '=', true)
      .where('Document.type', '=', type)
      .modify(applyDecouplingRestriction(type))
      .modify((qb) => {
        if (orderResults) {
          qb.orderBy([
            { column: 'Document.updated_at', order: 'desc' },
            { column: 'Document.created_at', order: 'desc' },
          ]);
        }
      })
      .groupBy(['Document.id']);
  },

  loadSeoDocumentsByServiceSlug: async (
    type: string,
    serviceSlug: string,
    include_metadata: DocumentMetadataKeyCode[] = [],
    orderResults: boolean = true
  ): Promise<Document[]> => {
    const documents: Document[] =
      await DocumentDomain.buildSeoDocumentsByServiceSlugQuery(
        type,
        serviceSlug,
        orderResults
      );

    return DocumentMetadataDomain.hydrateMetadata(documents, include_metadata);
  },

  updateDocument: async ({
    parentDocumentId,
    document,
    uploader_id,
    uploader_organization_id,
  }: {
    parentDocumentId: string;
    document: {
      data: UpdateDocumentInput;
      file?: MinioFile;
      type: string;
    };
    uploader_organization_id: OrganizationId | null;
    uploader_id: UserId;
  }): Promise<DocumentModel | undefined> => {
    const user = requestContext.requireUser();
    const completeDocumentData = {
      ...document.data,
      ...(document.file
        ? {
            file_name: document.file.fileName,
            minio_name: document.file.minioName,
            mime_type: document.file.mimeType,
          }
        : {}),
      type: document.type,
    };
    const [updatedDocument] = await db<DocumentModel>('Document')
      .where('id', '=', parentDocumentId)
      .update({
        ...stripNulls(
          omit(completeDocumentData, ['use_cases', 'solution_categories'])
        ),
        uploader_organization_id,
        uploader_id,
        updated_at: new Date(),
        updater_id: user.id,
      })
      .returning('*');

    return updatedDocument;
  },

  upsertOnSlug: async <
    T extends DocumentModel,
    TUseCase extends string = UseCaseValue,
  >(
    documentData: DocumentData<T, TUseCase>,
    metadataKeys: DocumentMetadataKeys<T> = []
  ): Promise<DocumentModel> => {
    const user = requestContext.requireUser();
    const insertData = {
      ...omit(documentData, [
        'parent_document_id',
        'use_cases',
        'solution_categories',
        ...metadataKeys,
      ]),
      uploader_id: user.id,
      uploader_organization_id: user.selected_organization_id,
    };

    const slug = (documentData as { slug?: string }).slug;

    const existingDocument = slug
      ? await db<DocumentModel>('Document')
          .where('slug', '=', slug)
          .modify(excludeDecouplingTag)
          .orderBy('created_at', 'desc')
          .first()
      : undefined;

    if (existingDocument) {
      const [updatedDocument] = await db<DocumentModel>('Document')
        .where('id', '=', existingDocument.id)
        .update({
          ...omit(insertData, ['uploader_id']),
          updated_at: new Date(),
          updater_id: insertData.uploader_id,
        })
        .returning('*');

      if (!updatedDocument) {
        throw new Error(UnknownErrorCode.DocumentUpdateError);
      }
      return updatedDocument;
    }

    const [document] = await db<DocumentModel>('Document')
      .insert(insertData)
      .returning('*');

    if (!document) {
      throw new Error(UnknownErrorCode.DocumentCreateError);
    }
    return document;
  },

  deleteDocuments: async (ids: DocumentId[]) => {
    await db<Document>('Document').whereIn('id', ids).delete();
  },

  loadNewestDocuments: async (
    limit: number,
    include_metadata: DocumentMetadataKeyCode[] = [],
    documentTypes?: DOCUMENT_TYPE[]
  ): Promise<Document[]> => {
    const documents = await db<Document>('Document')
      .select('Document.*')
      .where('Document.active', true)
      .whereNotExists(function () {
        this.select(dbRaw('1'))
          .from('Document_Children')
          .whereRaw(
            '"Document_Children"."child_document_id" = "Document"."id"'
          );
      })
      .modify(applyDecouplingRestrictionForMixedTypes)
      .tap(restrictDocumentToAccessibleServiceInstance)
      .modify((qb) => {
        if (documentTypes?.length) {
          qb.whereIn('Document.type', documentTypes);
        }
      })
      .orderBy('Document.created_at', 'desc')
      .limit(limit)
      .groupBy(['Document.id']);

    return DocumentMetadataDomain.hydrateMetadata(documents, include_metadata);
  },

  loadMostDeployedDocuments: async (
    limit: number,
    include_metadata: DocumentMetadataKeyCode[] = [],
    documentTypes?: DOCUMENT_TYPE[]
  ): Promise<Document[]> => {
    const deployCounts = db('OneClickDeployment')
      .select('resource_id')
      .count('* as deploy_count')
      .modify((qb) => {
        if (documentTypes?.length) {
          qb.whereIn(
            'resource_id',
            db('Document').select('id').whereIn('type', documentTypes)
          );
        }
      })
      .groupBy('resource_id')
      .as('deploy_counts');

    const documents = await db<Document>('Document')
      .select('Document.*')
      .join(deployCounts, 'deploy_counts.resource_id', 'Document.id')
      .tap(restrictDocumentToAccessibleServiceInstance)
      .groupBy(['Document.id'])
      .orderByRaw('MAX("deploy_counts"."deploy_count") DESC')
      .orderBy('Document.id', 'asc')
      .limit(limit);

    return DocumentMetadataDomain.hydrateMetadata(documents, include_metadata);
  },

  /**
   * For each connector slug in the provided list, returns the connector with
   * the highest product version that is still compatible with manifestVersion
   * (i.e. minimum_deployable_version_padded is absent or <= manifestVersion, padded).
   * Exactly one row per slug is returned (or none if no compatible version exists).
   */
  loadBestCompatibleConnectorsBySlugs: async (
    slugs: string[],
    version: string
  ): Promise<ConnectorV2[]> => {
    if (slugs.length === 0) return [];

    const paddedVersion =
      ManifestFragmentHelper.validateAndFormatManifestVersion(version);
    const isLts = isLtsVersion(version);
    const metadataKeys =
      INTEGRATION_CONNECTOR_V2_METADATA_KEYS as DocumentMetadataKeyCode[];

    const connectors: ConnectorV2[] = await db<DocumentModel>('Document')
      .distinctOn('Document.slug')
      .join(
        'Document_Metadata as dm_type',
        'Document.id',
        'dm_type.document_id'
      )
      .leftJoin({ dm_min: 'Document_Metadata' }, function () {
        this.on('dm_min.document_id', '=', 'Document.id').andOnVal(
          'dm_min.key',
          DocumentMetadataKeyCode.MinimumDeployableVersionPadded
        );
      })
      .where('dm_type.key', DocumentMetadataKeyCode.IntegrationType)
      .andWhere('dm_type.value', IntegrationType.Connector)
      .whereIn('Document.slug', slugs)
      .where('Document.active', true)
      .where('Document.is_decommissioned', false)
      .select('Document.*')
      .groupBy('Document.id', 'Document.slug')
      .havingRaw(
        `(MAX("dm_min"."value") IS NULL OR MAX("dm_min"."value") <= ?)
         AND "Document"."version" ${isLts ? 'LIKE' : 'NOT LIKE'} '%.LTS.%'`,
        [paddedVersion]
      )
      .orderByRaw(
        `"Document"."slug" ASC, "Document"."version" DESC NULLS LAST`
      );

    return DocumentMetadataDomain.hydrateMetadata(connectors, metadataKeys);
  },

  /**
   * Returns the distinct slugs of the connectors currently known as "latest"
   * for the given product version's track, i.e. active, non-decommissioned
   * decoupled connector documents tagged TAG_LATEST (or TAG_LATEST_LTS for an
   * LTS version) + TAG_DECOUPLING.
   */
  loadDistinctConnectorSlugs: async (version: string): Promise<string[]> => {
    const tag = isLtsVersion(version) ? TAG_LATEST_LTS : TAG_LATEST;

    const rows: Pick<DocumentModel, 'slug'>[] = await db<DocumentModel>(
      'Document'
    )
      .join(
        'Document_Metadata as dm_type',
        'Document.id',
        'dm_type.document_id'
      )
      .where('dm_type.key', DocumentMetadataKeyCode.IntegrationType)
      .andWhere('dm_type.value', IntegrationType.Connector)
      .where('Document.active', true)
      .where('Document.is_decommissioned', false)
      .whereRaw(`"Document"."tags" @> ARRAY[?, ?]::text[]`, [
        tag,
        TAG_DECOUPLING,
      ])
      .whereNotNull('Document.slug')
      .distinct('Document.slug');

    return rows
      .map((row) => row.slug)
      .filter((slug): slug is string => slug !== null);
  },
};
