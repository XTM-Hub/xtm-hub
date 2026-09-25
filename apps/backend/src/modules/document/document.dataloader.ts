import DataLoader from 'dataloader';
import { toGlobalId } from 'graphql-relay/node/node.js';
import {
  IntegrationType,
  Organization,
  SolutionCategory,
} from '../../__generated__/resolvers-types';
import { OrganizationId } from '../../model/kanel/public/Organization';
import ServiceInstance, {
  ServiceInstanceId,
} from '../../model/kanel/public/ServiceInstance';
import Subscription from '../../model/kanel/public/Subscription';
import UseCase from '../../model/kanel/public/UseCase';
import User, { UserId } from '../../model/kanel/public/User';
import {
  CompositeKey,
  defineCompositeKey,
} from '../../utils/dataloader-key.util';
import { UserDomain } from '../organization-management/user/user-domain/user.domain';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';
import { solutionCategoryDomain } from '../solution-category/solution-category.domain';
import { SubscriptionDomain } from '../subscription/subscription.domain';
import { useCaseDomain } from '../use-case/use-case.domain';
import { Document, WithDocumentId, WithParentId } from './document.helper';
import { DOCUMENT_IMAGE_METADATA_KEYS } from './document.model';
import { DocumentChildrenDomain } from './domain/document.children.domain';
import { DocumentDomain } from './domain/document.domain';
import { DocumentMetadataDomain } from './domain/document.metadata.domain';

interface SubscriptionByServiceInstanceFields extends Record<string, string> {
  organizationId: OrganizationId;
  serviceInstanceId: ServiceInstanceId;
}

type SubscriptionByServiceInstanceLoaderKey =
  CompositeKey<SubscriptionByServiceInstanceFields>;

export const subscriptionByServiceInstanceLoaderKey =
  defineCompositeKey<SubscriptionByServiceInstanceFields>([
    'organizationId',
    'serviceInstanceId',
  ]);

export interface DocumentDataLoaders {
  documentByIdLoader: DataLoader<string, Document | null>;
  userLoader: DataLoader<string, User | null>;
  uploaderLoader: DataLoader<string, User | null>;
  uploaderOrganizationLoader: DataLoader<string, Organization | null>;
  childrenDocumentsLoader: DataLoader<string, Document[]>;
  imagesByDocumentIdLoader: DataLoader<string, Document[]>;
  useCasesByDocumentIdLoader: DataLoader<string, UseCase[]>;
  solutionCategoriesByDocumentIdLoader: DataLoader<string, SolutionCategory[]>;
  integrationTypeLoader: DataLoader<string, IntegrationType | null>;
  serviceInstanceByIdLoader: DataLoader<string, ServiceInstance | undefined>;
  subscriptionByServiceInstanceLoader: DataLoader<
    SubscriptionByServiceInstanceLoaderKey,
    Subscription | null
  >;
}

export const DocumentDataLoader = {
  batchLoadDocumentsById: async (
    ids: readonly string[]
  ): Promise<(Document | null)[]> => {
    const documents =
      await DocumentDomain.loadDocumentsWithMetadataByIds<Document>([...ids]);
    const map = new Map<string, Document>(
      documents.map((document) => [document.id, document])
    );
    return ids.map((id) => map.get(id) ?? null);
  },

  batchLoadUsers: async (ids: readonly string[]): Promise<(User | null)[]> => {
    const users = await UserDomain.loadUsers(ids as UserId[]);
    const map = new Map<string, User>(users.map((user) => [user.id, user]));
    return ids.map((id) => map.get(id) ?? null);
  },

  batchLoadUploaders: async (
    ids: readonly string[]
  ): Promise<(User | null)[]> => {
    const rows: WithDocumentId<User>[] =
      await DocumentDomain.buildUploaderQuery(ids);

    const map = new Map<string, User>(
      rows.map((row) => [row._document_id, row])
    );
    return ids.map((id) => map.get(id) ?? null);
  },

  batchLoadUploaderOrganizations: async (
    ids: readonly string[]
  ): Promise<(Organization | null)[]> => {
    const rows: WithDocumentId<Organization>[] =
      await DocumentDomain.buildUploaderOrganizationQuery(ids);

    const map = new Map<string, Organization>(
      rows.map((row) => [row._document_id, row])
    );
    return ids.map((id) => map.get(id) ?? null);
  },

  batchLoadChildrenDocuments: async (
    ids: readonly string[]
  ): Promise<Document[][]> => {
    const rows: WithParentId<Document>[] =
      await DocumentChildrenDomain.loadChildrenDocumentsByParentIds<
        WithParentId<Document>
      >(ids, {
        isDataLoader: true,
        includeMetadata: DOCUMENT_IMAGE_METADATA_KEYS,
      });

    const map = new Map<string, Document[]>();
    for (const row of rows) {
      const existing = map.get(row._parent_id) ?? [];
      existing.push(row);
      map.set(row._parent_id, existing);
    }
    return ids.map((id) => map.get(id) ?? []);
  },

  batchLoadImagesByDocumentId: async (
    ids: readonly string[]
  ): Promise<Document[][]> => {
    const rows: WithParentId<Document>[] =
      await DocumentChildrenDomain.loadImagesByParentIds<
        WithParentId<Document>
      >(ids, {
        isDataLoader: true,
      });

    const map = new Map<string, Document[]>();
    for (const row of rows) {
      const image = {
        ...row,
        id: toGlobalId('Document', row.id) as typeof row.id,
      };
      const existing = map.get(row._parent_id) ?? [];
      existing.push(image);
      map.set(row._parent_id, existing);
    }
    return ids.map((id) => map.get(id) ?? []);
  },

  batchLoadUseCasesByDocumentId: async (
    ids: readonly string[]
  ): Promise<UseCase[][]> => {
    const rows: WithDocumentId<UseCase>[] =
      await useCaseDomain.buildUseCasesByDocumentIdQuery(ids);

    const map = new Map<string, UseCase[]>();
    for (const row of rows) {
      const existing = map.get(row._document_id) ?? [];
      existing.push(row);
      map.set(row._document_id, existing);
    }
    return ids.map((id) => map.get(id) ?? []);
  },

  batchLoadSolutionCategoriesByDocumentId: async (
    ids: readonly string[]
  ): Promise<SolutionCategory[][]> => {
    const rows: WithDocumentId<SolutionCategory>[] =
      await solutionCategoryDomain.buildSolutionCategoriesByDocumentIdQuery(
        ids
      );

    const map = new Map<string, SolutionCategory[]>();
    for (const row of rows) {
      const existing = map.get(row._document_id) ?? [];
      existing.push(row);
      map.set(row._document_id, existing);
    }
    return ids.map((id) => map.get(id) ?? []);
  },

  batchLoadIntegrationTypes: async (
    ids: readonly string[]
  ): Promise<(IntegrationType | null)[]> => {
    type Row = { document_id: string; value: IntegrationType };
    const rows: Row[] =
      await DocumentMetadataDomain.buildIntegrationTypeQuery(ids);

    const map = new Map<string, IntegrationType>(
      rows.map((row) => [row.document_id, row.value])
    );
    return ids.map((id) => map.get(id) ?? null);
  },

  batchLoadServiceInstances: async (
    ids: readonly string[]
  ): Promise<(ServiceInstance | undefined)[]> => {
    const serviceInstances =
      await ServiceInstanceDomain.loadServiceInstancesByIds(
        ids as ServiceInstanceId[]
      );

    const map = new Map<string, ServiceInstance>(
      serviceInstances.map((serviceInstance) => [
        serviceInstance.id,
        serviceInstance,
      ])
    );

    return ids.map((id) => map.get(id));
  },

  batchLoadSubscriptionsByServiceInstance: async (
    keys: readonly SubscriptionByServiceInstanceLoaderKey[]
  ): Promise<(Subscription | null)[]> => {
    const parsedKeys = keys.map(subscriptionByServiceInstanceLoaderKey.parse);
    const organizationIds = [
      ...new Set(parsedKeys.map(({ organizationId }) => organizationId)),
    ];
    const serviceInstanceIds = [
      ...new Set(parsedKeys.map(({ serviceInstanceId }) => serviceInstanceId)),
    ];

    const subscriptions =
      await SubscriptionDomain.loadSubscriptionsByOrganizationAndServiceInstanceIds(
        {
          organizationIds,
          serviceInstanceIds,
        }
      );

    const map = new Map<string, Subscription>(
      subscriptions.map((subscription) => [
        subscriptionByServiceInstanceLoaderKey.create({
          organizationId: subscription.organization_id,
          serviceInstanceId: subscription.service_instance_id,
        }),
        subscription,
      ])
    );

    return parsedKeys.map(({ organizationId, serviceInstanceId }) => {
      const key = subscriptionByServiceInstanceLoaderKey.create({
        organizationId,
        serviceInstanceId,
      });
      return map.get(key) ?? null;
    });
  },

  create: (): DocumentDataLoaders => ({
    documentByIdLoader: new DataLoader(
      DocumentDataLoader.batchLoadDocumentsById
    ),
    userLoader: new DataLoader(DocumentDataLoader.batchLoadUsers),
    uploaderLoader: new DataLoader(DocumentDataLoader.batchLoadUploaders),
    uploaderOrganizationLoader: new DataLoader(
      DocumentDataLoader.batchLoadUploaderOrganizations
    ),
    childrenDocumentsLoader: new DataLoader(
      DocumentDataLoader.batchLoadChildrenDocuments
    ),
    imagesByDocumentIdLoader: new DataLoader(
      DocumentDataLoader.batchLoadImagesByDocumentId
    ),
    useCasesByDocumentIdLoader: new DataLoader(
      DocumentDataLoader.batchLoadUseCasesByDocumentId
    ),
    solutionCategoriesByDocumentIdLoader: new DataLoader(
      DocumentDataLoader.batchLoadSolutionCategoriesByDocumentId
    ),
    integrationTypeLoader: new DataLoader(
      DocumentDataLoader.batchLoadIntegrationTypes
    ),
    serviceInstanceByIdLoader: new DataLoader(
      DocumentDataLoader.batchLoadServiceInstances
    ),
    subscriptionByServiceInstanceLoader: new DataLoader(
      DocumentDataLoader.batchLoadSubscriptionsByServiceInstance
    ),
  }),
};
