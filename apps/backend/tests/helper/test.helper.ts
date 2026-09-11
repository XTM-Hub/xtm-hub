import { v4 as uuidv4 } from 'uuid';
import { db } from '../../knexfile';
import {
  CompetitorTier,
  FiligranProduct,
  ManifestType,
  PlatformIdentifier,
  Timeline,
  VotingRoundStatus,
} from '../../src/__generated__/resolvers-types';
import Competitor, {
  CompetitorId,
  CompetitorMutator,
} from '../../src/model/kanel/public/Competitor';
import Epic, { EpicId, EpicMutator } from '../../src/model/kanel/public/Epic';
import FeatureVote, {
  FeatureVoteInitializer,
  FeatureVoteMutator,
} from '../../src/model/kanel/public/FeatureVote';
import Manifest, {
  ManifestId,
  ManifestInitializer,
  ManifestMutator,
} from '../../src/model/kanel/public/Manifest';
import ManifestDocument, {
  ManifestDocumentMutator,
} from '../../src/model/kanel/public/ManifestDocument';
import ManifestRebuildQueue, {
  ManifestRebuildQueueId,
  ManifestRebuildQueueInitializer,
  ManifestRebuildQueueMutator,
} from '../../src/model/kanel/public/ManifestRebuildQueue';
import ObjectSolutionCategory, {
  ObjectSolutionCategoryMutator,
} from '../../src/model/kanel/public/ObjectSolutionCategory';
import ObjectUseCase, {
  ObjectUseCaseInitializer,
  ObjectUseCaseMutator,
} from '../../src/model/kanel/public/ObjectUseCase';
import OneClickDeployment, {
  OneClickDeploymentInitializer,
  OneClickDeploymentMutator,
} from '../../src/model/kanel/public/OneClickDeployment';
import Organization, {
  OrganizationId,
  OrganizationInitializer,
  OrganizationMutator,
} from '../../src/model/kanel/public/Organization';
import ProductVersion, {
  ProductVersionId,
  ProductVersionInitializer,
  ProductVersionMutator,
} from '../../src/model/kanel/public/ProductVersion';
import { ServiceInstanceId } from '../../src/model/kanel/public/ServiceInstance';
import Subscription, {
  SubscriptionId,
  SubscriptionMutator,
} from '../../src/model/kanel/public/Subscription';
import UseCase, {
  UseCaseInitializer,
  UseCaseMutator,
} from '../../src/model/kanel/public/UseCase';
import VotableFeature, {
  VotableFeatureId,
  VotableFeatureInitializer,
  VotableFeatureMutator,
} from '../../src/model/kanel/public/VotableFeature';
import VotingRound, {
  VotingRoundId,
  VotingRoundInitializer,
  VotingRoundMutator,
} from '../../src/model/kanel/public/VotingRound';
import { ManifestFragmentHelper } from '../../src/modules/shareable-resource/manifest-fragment/manifest-fragment.helper';
import { ManifestRebuildQueueStatus } from '../../src/modules/shareable-resource/manifest/manifest.consts';
import { TEST_ORGANIZATIONS } from '../tests.const';
import {
  mockPlatformConfig,
  TestPlatformConfigurationHelper,
} from './test-platform-configuration.helper';
import { TestDeploymentHelper } from './test.deployment.helper';
import { TestDocumentHelper } from './test.document.helper';
import { TestNewsfeedHelper } from './test.newsfeed.helper';
import { TestServiceHelper } from './test.service.helper';
import { TestUserHelper } from './test.user.helper';

export { seedDocuments } from './perf/test.document.perf.helper';
export type {
  SeedDocumentsOpts,
  SeedDocumentsResult,
} from './perf/test.document.perf.helper';
export { measureAvgDuration } from './perf/test.perf.helper';
export { mockPlatformConfig };

export const DEFAULT_ONE_CLICK_PLATFORM_ID =
  'a1b2c3d4-0000-4000-8000-000000000001';

export const TestHelper = {
  ...TestDocumentHelper,
  ...TestServiceHelper,
  ...TestPlatformConfigurationHelper,
  ...TestUserHelper,
  ...TestDeploymentHelper,
  ...TestNewsfeedHelper,
  subscription: {
    create: async (data?: Partial<Subscription>): Promise<Subscription> => {
      const [subscription] = await db<Subscription>('Subscription')
        .insert({
          id: uuidv4() as SubscriptionId,
          ...data,
        })
        .returning('*');
      return subscription!;
    },
    delete: async (field: SubscriptionMutator) => {
      await db<Subscription>('Subscription').where(field).del();
    },
    load: async (
      field: SubscriptionMutator
    ): Promise<Subscription | undefined> => {
      return db<Subscription>('Subscription').where(field).select('*').first();
    },
    loadAll: async (field: SubscriptionMutator): Promise<Subscription[]> => {
      return db<Subscription[]>('Subscription').where(field).select('*');
    },
  },
  organization: {
    create: async (
      data?: Partial<OrganizationInitializer>
    ): Promise<Organization> => {
      const [organization] = await db<Organization>('Organization')
        .insert({
          id: uuidv4() as OrganizationId,
          name: `test-organization-${uuidv4()}`,
          personal_space: false,
          ...data,
        })
        .returning('*');
      return organization!;
    },
    load: async (
      field: OrganizationMutator
    ): Promise<Organization | undefined> => {
      return db<Organization>('Organization').where(field).select('*').first();
    },
    delete: async (field: OrganizationMutator) => {
      await db<Organization>('Organization').where(field).del();
    },
  },
  oneClickDeployment: {
    insert: async (
      data: Partial<OneClickDeploymentInitializer> & { resource_id: string }
    ): Promise<OneClickDeployment> => {
      const [row] = await db<OneClickDeployment>('OneClickDeployment')
        .insert({
          platform_id: DEFAULT_ONE_CLICK_PLATFORM_ID,
          tenant_id: null,
          user_id: null,
          deployed_at: new Date(),
          ...data,
        })
        .returning('*');
      return row!;
    },
    loadAll: async (
      field: OneClickDeploymentMutator = {}
    ): Promise<OneClickDeployment[]> => {
      return db<OneClickDeployment[]>('OneClickDeployment')
        .where(field)
        .select('*')
        .orderBy('deployed_at', 'desc');
    },
    deleteAll: async (): Promise<void> => {
      await db<OneClickDeployment>('OneClickDeployment').del();
    },
  },
  competitor: {
    create: async (
      data?: CompetitorMutator
    ): Promise<Competitor | undefined> => {
      const [competitor] = await db<Competitor>('Competitor')
        .insert({
          id: uuidv4() as CompetitorId,
          name: TEST_ORGANIZATIONS.FILIGRAN.NAME,
          tier: CompetitorTier.Tier1,
          domain: TEST_ORGANIZATIONS.FILIGRAN.DOMAINS.FIRST,
          ...data,
        })
        .returning('*');
      return competitor;
    },
    delete: async (field: CompetitorMutator) => {
      await db<Competitor>('Competitor').where(field).del();
    },
    load: async (field: CompetitorMutator): Promise<Competitor | undefined> => {
      return db<Competitor>('Competitor').where(field).select('*').first();
    },
  },
  epic: {
    create: async (data?: EpicMutator): Promise<Epic | undefined> => {
      const [epic] = await db<Epic>('Epic')
        .insert({
          id: uuidv4() as EpicId,
          title: 'Test Epic',
          short_description: 'Short desc',
          description: 'Long description for the epic',
          active: true,
          product: [FiligranProduct.Opencti],
          timeline: Timeline.Now,
          ...data,
        })
        .returning('*');
      return epic;
    },
    delete: async (field: EpicMutator) => {
      await db<Epic>('Epic').where(field).del();
    },
    load: async (field: EpicMutator): Promise<Epic | undefined> => {
      return db<Epic>('Epic').where(field).select('*').first();
    },
  },
  useCase: {
    create: async (data: UseCaseInitializer): Promise<UseCase> => {
      const [useCase] = await db<UseCase>('UseCase')
        .insert(data)
        .returning('*');
      return useCase!;
    },
    delete: async (field: UseCaseMutator) => {
      await db<UseCase>('UseCase').where(field).del();
    },
    load: async (field: UseCaseMutator): Promise<UseCase | undefined> => {
      return db<UseCase>('UseCase').where(field).select('*').first();
    },
    loadAll: async (field: UseCaseMutator): Promise<UseCase[] | undefined> => {
      return db<UseCase[]>('UseCase').where(field).select('*');
    },
  },
  objectUseCase: {
    insert: async (
      data: ObjectUseCaseInitializer | ObjectUseCaseInitializer[]
    ): Promise<void> => {
      await db<ObjectUseCase>('Object_UseCase').insert(data);
    },
    delete: async (field: ObjectUseCaseMutator): Promise<void> => {
      await db<ObjectUseCase>('Object_UseCase').where(field).del();
    },
    load: async (field: ObjectUseCaseMutator): Promise<ObjectUseCase[]> => {
      return db<ObjectUseCase[]>('Object_UseCase').where(field).select('*');
    },
  },
  objectSolutionCategory: {
    delete: async (field: ObjectSolutionCategoryMutator): Promise<void> => {
      await db<ObjectSolutionCategory>('Object_SolutionCategory')
        .where(field)
        .del();
    },
    load: async (
      field: ObjectSolutionCategoryMutator
    ): Promise<ObjectSolutionCategory[]> => {
      return db<ObjectSolutionCategory[]>('Object_SolutionCategory')
        .where(field)
        .select('*');
    },
  },
  manifestRebuildQueue: {
    create: async (
      data?: Partial<ManifestRebuildQueueInitializer>
    ): Promise<ManifestRebuildQueue> => {
      const [row] = await db<ManifestRebuildQueue>('ManifestRebuildQueue')
        .insert({
          id: uuidv4() as ManifestRebuildQueueId,
          product: PlatformIdentifier.Opencti,
          version: '6.4.0',
          type: ManifestType.Connector,
          status: ManifestRebuildQueueStatus.Pending,
          ...data,
        })
        .returning('*');
      return row!;
    },
    delete: async (field: ManifestRebuildQueueMutator) => {
      await db<ManifestRebuildQueue>('ManifestRebuildQueue').where(field).del();
    },
    load: async (
      field: ManifestRebuildQueueMutator
    ): Promise<ManifestRebuildQueue | undefined> => {
      return db<ManifestRebuildQueue>('ManifestRebuildQueue')
        .where(field)
        .select('*')
        .first();
    },
    loadAll: async (
      field: ManifestRebuildQueueMutator
    ): Promise<ManifestRebuildQueue[]> => {
      return db<ManifestRebuildQueue[]>('ManifestRebuildQueue')
        .where(field)
        .select('*');
    },
  },
  manifest: {
    create: async (data?: Partial<ManifestInitializer>): Promise<Manifest> => {
      const version = data?.version ?? '6.4.0';
      const [row] = await db<Manifest>('Manifest')
        .insert({
          id: uuidv4() as ManifestId,
          product: PlatformIdentifier.Opencti,
          version,
          version_padded:
            ManifestFragmentHelper.validateAndFormatManifestVersion(version),
          type: ManifestType.Connector,
          name: 'test-manifest',
          ...data,
        })
        .returning('*');
      return row!;
    },
    loadAll: async (field: ManifestMutator): Promise<Manifest[]> => {
      return db<Manifest[]>('Manifest').where(field).select('*');
    },
    load: async (field: ManifestMutator): Promise<Manifest | undefined> => {
      return db<Manifest>('Manifest').where(field).select('*').first();
    },
    delete: async (field: ManifestMutator): Promise<void> => {
      await db<Manifest>('Manifest').where(field).del();
    },
  },
  votingRound: {
    create: async (
      data: Partial<VotingRoundInitializer> & {
        service_instance_id: ServiceInstanceId;
      }
    ): Promise<VotingRound> => {
      const [votingRound] = await db<VotingRound>('VotingRound')
        .insert({
          id: uuidv4() as VotingRoundId,
          name: `test-voting-round-${uuidv4()}`,
          status: VotingRoundStatus.Draft,
          created_at: new Date(),
          ...data,
        })
        .returning('*');
      return votingRound!;
    },
    load: async (
      field: VotingRoundMutator
    ): Promise<VotingRound | undefined> => {
      return db<VotingRound>('VotingRound').where(field).select('*').first();
    },
    delete: async (field: VotingRoundMutator): Promise<void> => {
      await db<VotingRound>('VotingRound').where(field).del();
    },
  },
  votableFeature: {
    create: async (
      data: Partial<VotableFeatureInitializer> & {
        voting_round_id: VotingRoundId;
      }
    ): Promise<VotableFeature> => {
      const [feature] = await db<VotableFeature>('VotableFeature')
        .insert({
          id: uuidv4() as VotableFeatureId,
          title: `test-feature-${uuidv4()}`,
          short_description: 'Short',
          description: 'Long',
          product: FiligranProduct.Opencti,
          position: 0,
          active: true,
          created_at: new Date(),
          ...data,
        })
        .returning('*');
      return feature!;
    },
    loadAll: async (
      field: VotableFeatureMutator
    ): Promise<VotableFeature[]> => {
      return db<VotableFeature[]>('VotableFeature').where(field).select('*');
    },
  },
  featureVote: {
    create: async (data: FeatureVoteInitializer): Promise<void> => {
      await db<FeatureVote>('FeatureVote').insert(data);
    },
    loadAll: async (field: FeatureVoteMutator): Promise<FeatureVote[]> => {
      return db<FeatureVote[]>('FeatureVote').where(field).select('*');
    },
  },
  manifestDocument: {
    loadAll: async (
      field: ManifestDocumentMutator
    ): Promise<ManifestDocument[]> => {
      return db<ManifestDocument[]>('Manifest_Document')
        .where(field)
        .select('*');
    },
    delete: async (field: ManifestDocumentMutator): Promise<void> => {
      await db<ManifestDocument>('Manifest_Document').where(field).del();
    },
  },
  productVersion: {
    create: async (
      data?: Partial<ProductVersionInitializer>
    ): Promise<ProductVersion> => {
      const version = data?.version ?? '6.4.0';
      const [row] = await db<ProductVersion>('ProductVersion')
        .insert({
          id: uuidv4() as ProductVersionId,
          product: PlatformIdentifier.Opencti,
          version,
          version_padded:
            ManifestFragmentHelper.validateAndFormatManifestVersion(version),
          ...data,
        })
        .returning('*');
      return row!;
    },
    loadAll: async (
      field: ProductVersionMutator
    ): Promise<ProductVersion[]> => {
      return db<ProductVersion[]>('ProductVersion').where(field).select('*');
    },
    load: async (
      field: ProductVersionMutator
    ): Promise<ProductVersion | undefined> => {
      return db<ProductVersion>('ProductVersion')
        .where(field)
        .select('*')
        .first();
    },
    delete: async (field: ProductVersionMutator): Promise<void> => {
      await db<ProductVersion>('ProductVersion').where(field).del();
    },
  },
};
