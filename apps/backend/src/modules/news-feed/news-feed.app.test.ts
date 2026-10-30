import config from 'config';
import { v4 as uuidv4 } from 'uuid';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  requestContextSimpleUserSecondOrga,
  SERVICES,
  TEST_ORGANIZATIONS,
} from '../../../tests/tests.const';
import {
  IntegrationType,
  NewsFeedItemMetadataKey,
  NewsFeedItemType,
  PlatformConfigurationStatus,
  PlatformContract,
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
} from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import Document from '../../model/kanel/public/Document';
import { NewsFeedItemId } from '../../model/kanel/public/NewsFeedItem';
import { ObjectUseCaseObjectId } from '../../model/kanel/public/ObjectUseCase';
import { OrganizationId } from '../../model/kanel/public/Organization';
import PlatformConfigurationModel from '../../model/kanel/public/PlatformConfiguration';
import { ProvisionedNewsFeedItemPlatformId } from '../../model/kanel/public/ProvisionedNewsFeedItem';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { BlogApiClient } from '../../thirdparty/blog-api/client';
import {
  BlogApiError,
  BlogApiErrorCode,
} from '../../thirdparty/blog-api/errors';
import type { BlogFeedItem } from '../../thirdparty/blog-api/schema';
import { logApp } from '../../utils/app-logger.util';
import { ErrorCode } from '../../utils/error/error.code';
import { RequiredPlatformVersions } from '../../utils/required-platform-version';
import { objectUseCaseDomain } from '../use-case/object-use-case/object-use-case.domain';
import { useCaseDomain } from '../use-case/use-case.domain';
import { NewsFeedApp } from './news-feed.app';
import { NewsFeedDomain } from './news-feed.domain';
import { NewsFeedHelper } from './news-feed.helper';

vi.mock('config', async (importOriginal) => {
  const mod = await importOriginal<{ default: typeof config }>();
  return {
    default: {
      get: vi.fn(mod.default.get.bind(mod.default)),
      has: mod.default.has.bind(mod.default),
    },
  };
});

const mockConfigGet = vi.mocked(config.get);

describe('newsFeedApp', () => {
  const createdServiceInstanceIds: ServiceInstanceId[] = [];

  const subscribeToCustomDashboards = async () => {
    await TestHelper.subscription.create({
      service_instance_id: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
      organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
    });
  };

  const createOpenCTIPlatformForOrganization = async (
    platformId: string,
    organizationId: OrganizationId,
    configOverrides: Partial<PlatformConfigurationModel> = {}
  ) => {
    const serviceInstance = await TestHelper.serviceInstance.create({
      service_definition_id: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
    });
    createdServiceInstanceIds.push(serviceInstance.id);
    await TestHelper.platformConfiguration.create({
      service_instance_id: serviceInstance.id,
      platform_id: platformId,
      platform_version: '7.260529.0',
      ...configOverrides,
    });
    await TestHelper.subscription.create({
      service_instance_id: serviceInstance.id,
      organization_id: organizationId,
    });
    return serviceInstance;
  };

  const subscribeToPlaybooks = async () => {
    await TestHelper.subscription.create({
      service_instance_id: SERVICES.INSTANCES.OPENCTI_PLAYBOOKS.ID,
      organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
    });
  };

  const cleanupCreatedServiceInstances = async () => {
    for (const id of createdServiceInstanceIds) {
      await TestHelper.subscription.delete({ service_instance_id: id });
      await TestHelper.platformConfiguration.delete({
        service_instance_id: id,
      });
      await TestHelper.serviceInstance.delete({ id });
    }
    createdServiceInstanceIds.length = 0;
  };

  describe('consumeProvisionedNewsFeedItems', () => {
    let platformId: string;
    let token: string;
    let registrationServiceInstanceId: ServiceInstanceId;

    beforeEach(async () => {
      const serviceInstance = await TestHelper.serviceInstance.create({
        service_definition_id: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
      });
      registrationServiceInstanceId = serviceInstance.id;
      const platformConfiguration =
        await TestHelper.platformConfiguration.create({
          service_instance_id: registrationServiceInstanceId,
        });
      platformId = platformConfiguration.platform_id;
      token = platformConfiguration.token;
    });

    afterEach(async () => {
      await TestHelper.newsFeed.deleteItem();
      await TestHelper.platformConfiguration.delete({
        service_instance_id: registrationServiceInstanceId,
      });
      await TestHelper.serviceInstance.delete({
        id: registrationServiceInstanceId,
      });
    });

    it('should throw when platformId is null', async () => {
      await expect(
        NewsFeedApp.consumeProvisionedNewsFeedItems({
          platformId: null,
          token,
        })
      ).rejects.toThrow(ErrorCode.InvalidPlatformId);
    });

    it('should throw when token is null', async () => {
      await expect(
        NewsFeedApp.consumeProvisionedNewsFeedItems({
          platformId,
          token: null,
        })
      ).rejects.toThrow(ErrorCode.InvalidPlatformId);
    });

    it('should throw when no service configuration matches platformId and token', async () => {
      await expect(
        NewsFeedApp.consumeProvisionedNewsFeedItems({
          platformId: uuidv4(),
          token: uuidv4(),
        })
      ).rejects.toThrow(ErrorCode.PlatformNotRegistered);
    });

    it('should return empty news feed items and available types when nothing is provisioned', async () => {
      const result = await NewsFeedApp.consumeProvisionedNewsFeedItems({
        platformId,
        token,
      });

      expect(result.news_feed_items).toHaveLength(0);
      expect(result.available_news_feed_types).toContain(
        NewsFeedItemType.ResourceCustomDashboard
      );
    });

    it('should return provisioned items and consume them (remove from provisioned table)', async () => {
      const item = await TestHelper.newsFeed.createItem({
        type: NewsFeedItemType.ResourceCustomDashboard,
        platform_identifier: PlatformIdentifier.Opencti,
        title: 'Dashboard A',
        creation_date: new Date(),
        tags: ['tag1'],
      });
      const item2 = await TestHelper.newsFeed.createItem({
        type: NewsFeedItemType.ResourceCustomDashboard,
        platform_identifier: PlatformIdentifier.Opencti,
        title: 'Dashboard B',
        creation_date: new Date(),
        tags: [],
      });

      await NewsFeedDomain.provisionNewsFeedItem(item.id, [platformId]);
      await NewsFeedDomain.provisionNewsFeedItem(item2.id, [platformId]);

      const result = await NewsFeedApp.consumeProvisionedNewsFeedItems({
        platformId,
        token,
      });

      expect(result.news_feed_items).toHaveLength(2);
      expect(result.news_feed_items.map((i) => i.title)).toEqual(
        expect.arrayContaining(['Dashboard A', 'Dashboard B'])
      );

      const remaining = await TestHelper.newsFeed.loadProvisioned({});
      expect(remaining).toHaveLength(0);
    });

    it('should return correct tags and metadata for provisioned items', async () => {
      const item = await TestHelper.newsFeed.createItem({
        type: NewsFeedItemType.ResourceCustomDashboard,
        platform_identifier: PlatformIdentifier.Opencti,
        title: 'Tagged Dashboard',
        creation_date: new Date(),
        tags: ['threat-intel', 'malware'],
      });
      await NewsFeedDomain.provisionNewsFeedItem(item.id, [platformId]);

      const result = await NewsFeedApp.consumeProvisionedNewsFeedItems({
        platformId,
        token,
      });

      expect(result.news_feed_items).toHaveLength(1);
      expect(result.news_feed_items[0]).toMatchObject({
        title: 'Tagged Dashboard',
        type: NewsFeedItemType.ResourceCustomDashboard,
        tags: expect.arrayContaining(['threat-intel', 'malware']),
        metadata: [],
      });
    });

    it('should only return items provisioned for the requesting platform', async () => {
      const otherPlatformId = uuidv4();
      const itemForOther = await TestHelper.newsFeed.createItem({
        type: NewsFeedItemType.ResourceCustomDashboard,
        platform_identifier: PlatformIdentifier.Opencti,
        title: 'Other Platform Dashboard',
        creation_date: new Date(),
        tags: [],
      });
      const itemForCurrent = await TestHelper.newsFeed.createItem({
        type: NewsFeedItemType.ResourceCustomDashboard,
        platform_identifier: PlatformIdentifier.Opencti,
        title: 'Current Platform Dashboard',
        creation_date: new Date(),
        tags: [],
      });
      await NewsFeedDomain.provisionNewsFeedItem(itemForOther.id, [
        otherPlatformId,
      ]);
      await NewsFeedDomain.provisionNewsFeedItem(itemForCurrent.id, [
        platformId,
      ]);

      const result = await NewsFeedApp.consumeProvisionedNewsFeedItems({
        platformId,
        token,
      });

      expect(result.news_feed_items).toHaveLength(1);
      expect(result.news_feed_items[0]?.title).toBe(
        'Current Platform Dashboard'
      );

      const remainingOther = await TestHelper.newsFeed.loadProvisioned({
        platform_id: otherPlatformId as ProvisionedNewsFeedItemPlatformId,
      });
      expect(remainingOther).toHaveLength(1);
    });

    it('should return available_news_feed_types for the OpenCTI platform', async () => {
      const result = await NewsFeedApp.consumeProvisionedNewsFeedItems({
        platformId,
        token,
      });

      expect(result.available_news_feed_types).toEqual(
        expect.arrayContaining([
          NewsFeedItemType.ResourceCustomDashboard,
          NewsFeedItemType.ResourcePlaybook,
          NewsFeedItemType.ResourceCustomView,
        ])
      );
    });

    describe('available_news_feed_types and the blogpost version gate', () => {
      const BLOGPOST_REQUIRED_VERSION = '7.260901.0';
      const originalBlogpostSupport =
        RequiredPlatformVersions.NewsFeedBlogpostSupport;

      afterEach(async () => {
        RequiredPlatformVersions.NewsFeedBlogpostSupport =
          originalBlogpostSupport;
        await cleanupCreatedServiceInstances();
      });

      it('should not list BLOG_POST for a supported version while the gate is disabled', async () => {
        // Given
        const gatedPlatformId = uuidv4();
        const gatedToken = uuidv4();
        await createOpenCTIPlatformForOrganization(
          gatedPlatformId,
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          { token: gatedToken, platform_version: '99.0.0' }
        );

        // When
        const result = await NewsFeedApp.consumeProvisionedNewsFeedItems({
          platformId: gatedPlatformId,
          token: gatedToken,
        });

        // Then
        expect(result.available_news_feed_types).not.toContain(
          NewsFeedItemType.BlogPost
        );
      });

      it.each`
        description  | version                      | expected
        ${'below'}   | ${'7.260831.0'}              | ${false}
        ${'equal'}   | ${BLOGPOST_REQUIRED_VERSION} | ${true}
        ${'above'}   | ${'7.260902.0'}              | ${true}
        ${'invalid'} | ${'not-a-version'}           | ${false}
        ${'missing'} | ${null}                      | ${false}
      `(
        'should list BLOG_POST only when the platform version is $description ($expected)',
        async ({ version, expected }) => {
          // Given
          RequiredPlatformVersions.NewsFeedBlogpostSupport = {
            [PlatformIdentifier.Opencti]: BLOGPOST_REQUIRED_VERSION,
            [PlatformIdentifier.Openaev]: null,
            [PlatformIdentifier.Xtmone]: null,
          };
          const gatedPlatformId = uuidv4();
          const gatedToken = uuidv4();
          await createOpenCTIPlatformForOrganization(
            gatedPlatformId,
            TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
            { token: gatedToken, platform_version: version }
          );

          // When
          const result = await NewsFeedApp.consumeProvisionedNewsFeedItems({
            platformId: gatedPlatformId,
            token: gatedToken,
          });

          // Then
          expect(
            result.available_news_feed_types.includes(NewsFeedItemType.BlogPost)
          ).toBe(expected);
        }
      );
    });

    it('should not return document_id metadata key in consumed response', async () => {
      const document = await TestHelper.document.create({
        name: 'Metadata Filter Dashboard',
      });

      try {
        const item = await NewsFeedDomain.createResourceNewsFeedItem({
          document,
          serviceDefinitionIdentifier:
            ServiceDefinitionIdentifier.OpenctiCustomDashboards,
          type: NewsFeedItemType.ResourceCustomDashboard,
          platformIdentifier: PlatformIdentifier.Opencti,
          tags: [],
        });
        await NewsFeedDomain.provisionNewsFeedItem(item.id, [platformId]);

        const result = await NewsFeedApp.consumeProvisionedNewsFeedItems({
          platformId,
          token,
        });

        expect(result.news_feed_items).toHaveLength(1);
        expect(result.news_feed_items[0]?.metadata).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ key: NewsFeedItemMetadataKey.UrlPath }),
          ])
        );
        expect(
          result.news_feed_items[0]?.metadata.find(
            (m) => m.key === NewsFeedItemMetadataKey.UrlPath
          )?.value
        ).toContain(
          'utm_source=opencti&utm_medium=newsfeed&utm_campaign=hub_resources&utm_content=custom_dashboard'
        );
        expect(result.news_feed_items[0]?.metadata).toEqual(
          expect.not.arrayContaining([
            expect.objectContaining({
              key: NewsFeedItemMetadataKey.DocumentId,
            }),
          ])
        );
      } finally {
        await TestHelper.document.delete({ id: document.id });
      }
    });

    it('should not return blog_post_slug metadata key in consumed response', async () => {
      const item = await TestHelper.newsFeed.createItem({
        type: NewsFeedItemType.BlogPost,
        title: 'Blog post',
      });
      await TestHelper.newsFeed.createMetadata({
        news_feed_item_id: item.id,
        key: NewsFeedItemMetadataKey.UrlPath,
        value: `redirect/news-feed/${item.id}`,
      });
      await TestHelper.newsFeed.createMetadata({
        news_feed_item_id: item.id,
        key: NewsFeedItemMetadataKey.BlogPostSlug,
        value: 'threat-report-2026',
      });
      await NewsFeedDomain.provisionNewsFeedItem(item.id, [platformId]);

      const result = await NewsFeedApp.consumeProvisionedNewsFeedItems({
        platformId,
        token,
      });

      expect(result.news_feed_items[0]?.metadata.map((m) => m.key)).toEqual([
        NewsFeedItemMetadataKey.UrlPath,
      ]);
    });

    it('should return the blog post display metadata keys in consumed response', async () => {
      const item = await TestHelper.newsFeed.createItem({
        type: NewsFeedItemType.BlogPost,
        title: 'Blog post',
      });
      const displayMetadata = [
        {
          key: NewsFeedItemMetadataKey.Description,
          value: 'How the integration works',
        },
        {
          key: NewsFeedItemMetadataKey.ImageUrl,
          value: 'https://filigran.io/image.png',
        },
        { key: NewsFeedItemMetadataKey.ImageAlt, value: 'Featured image' },
        {
          key: NewsFeedItemMetadataKey.AuthorNames,
          value: '["Romain Guignard"]',
        },
        { key: NewsFeedItemMetadataKey.ReadMinutes, value: '7' },
      ];
      for (const metadata of displayMetadata) {
        await TestHelper.newsFeed.createMetadata({
          news_feed_item_id: item.id,
          ...metadata,
        });
      }
      await TestHelper.newsFeed.createMetadata({
        news_feed_item_id: item.id,
        key: NewsFeedItemMetadataKey.BlogPostSlug,
        value: 'threat-report-2026',
      });
      await NewsFeedDomain.provisionNewsFeedItem(item.id, [platformId]);

      const result = await NewsFeedApp.consumeProvisionedNewsFeedItems({
        platformId,
        token,
      });

      expect(result.news_feed_items).toHaveLength(1);
      expect(result.news_feed_items[0]?.metadata).toHaveLength(
        displayMetadata.length
      );
      expect(result.news_feed_items[0]?.metadata).toEqual(
        expect.arrayContaining(
          displayMetadata.map((metadata) => expect.objectContaining(metadata))
        )
      );
    });

    it('should use the consuming platform as utm_source of the url_path', async () => {
      const document = await TestHelper.document.create({
        name: 'Cross Platform Dashboard',
      });

      try {
        const item = await NewsFeedDomain.createResourceNewsFeedItem({
          document,
          serviceDefinitionIdentifier:
            ServiceDefinitionIdentifier.OpenctiCustomDashboards,
          type: NewsFeedItemType.ResourceCustomDashboard,
          platformIdentifier: PlatformIdentifier.Openaev,
          tags: [],
        });
        await NewsFeedDomain.provisionNewsFeedItem(item.id, [platformId]);

        const result = await NewsFeedApp.consumeProvisionedNewsFeedItems({
          platformId,
          token,
        });

        const urlPath = result.news_feed_items[0]?.metadata.find(
          (m) => m.key === NewsFeedItemMetadataKey.UrlPath
        )?.value;
        expect(urlPath).toContain('utm_source=opencti');
        expect(urlPath).not.toContain('utm_source=openaev');
      } finally {
        await TestHelper.document.delete({ id: document.id });
      }
    });
  });

  describe('resource news feed item', () => {
    let document: Document;

    beforeEach(async () => {
      document = await TestHelper.document.create({
        name: 'My Custom Dashboard',
      });
    });

    afterEach(async () => {
      await objectUseCaseDomain.deleteObjectUseCaseBy({});
      await TestHelper.useCase.delete({});
      await TestHelper.newsFeed.deleteItem();
      await TestHelper.subscription.delete({
        service_instance_id: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
      });
      await TestHelper.subscription.delete({
        service_instance_id: SERVICES.INSTANCES.OPENCTI_PLAYBOOKS.ID,
      });
      await cleanupCreatedServiceInstances();
      await TestHelper.document.delete({});
    });

    describe('createResourceNewsFeedItem', () => {
      const createCustomDashboardNewsFeedItem = async () => {
        await NewsFeedApp.createResourceNewsFeedItem({
          document,
          serviceDefinitionIdentifier:
            ServiceDefinitionIdentifier.OpenctiCustomDashboards,
        });
      };

      it('should do nothing when the service definition is not configured', async () => {
        await NewsFeedApp.createResourceNewsFeedItem({
          document,
          serviceDefinitionIdentifier:
            ServiceDefinitionIdentifier.OpenctiRegistration,
        });

        const items = await TestHelper.newsFeed.loadItems();
        expect(items).toHaveLength(0);
      });

      it('should create a news feed item with the correct type and platform identifier', async () => {
        const platformId = uuidv4();
        await subscribeToCustomDashboards();
        await createOpenCTIPlatformForOrganization(
          platformId,
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
        );

        await createCustomDashboardNewsFeedItem();

        const items = await TestHelper.newsFeed.loadItems();
        expect(items).toHaveLength(1);
        expect(items[0]).toMatchObject({
          type: NewsFeedItemType.ResourceCustomDashboard,
          platform_identifier: PlatformIdentifier.Opencti,
          title: document.name,
        });
      });

      it('should provision the news feed item to all platforms with a platform_id', async () => {
        const firstPlatformId = uuidv4();
        const secondPlatformId = uuidv4();
        await subscribeToCustomDashboards();
        await createOpenCTIPlatformForOrganization(
          firstPlatformId,
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
        );
        await createOpenCTIPlatformForOrganization(
          secondPlatformId,
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
        );

        await createCustomDashboardNewsFeedItem();

        const newsFeedItem = await TestHelper.newsFeed.loadFirstItem();
        const provisioned = await TestHelper.newsFeed.loadProvisioned({
          news_feed_item_id: newsFeedItem!.id,
        });

        expect(provisioned).toHaveLength(2);
        expect(provisioned.map((p) => p.platform_id)).toEqual(
          expect.arrayContaining([firstPlatformId, secondPlatformId])
        );
      });

      it('should provision the news feed item to the OpenAEV platforms only when the document is a scenario', async () => {
        // Given
        const openAEVPlatformId = uuidv4();
        const openAEVServiceInstance = await TestHelper.serviceInstance.create({
          service_definition_id: SERVICES.DEFINITIONS.OPENAEV_REGISTRATION.ID,
        });
        createdServiceInstanceIds.push(openAEVServiceInstance.id);
        await TestHelper.platformConfiguration.create({
          service_instance_id: openAEVServiceInstance.id,
          platform_id: openAEVPlatformId,
          platform_version: '2.4.0',
        });
        await createOpenCTIPlatformForOrganization(
          uuidv4(),
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
        );

        // When
        await NewsFeedApp.createResourceNewsFeedItem({
          document,
          serviceDefinitionIdentifier:
            ServiceDefinitionIdentifier.OpenaevScenarios,
        });

        // Then
        const newsFeedItem = await TestHelper.newsFeed.loadFirstItem();
        expect(newsFeedItem).toMatchObject({
          type: NewsFeedItemType.ResourceScenario,
          platform_identifier: PlatformIdentifier.Openaev,
          title: document.name,
        });
        const provisioned = await TestHelper.newsFeed.loadProvisioned({
          news_feed_item_id: newsFeedItem!.id,
        });
        expect(provisioned.map((p) => p.platform_id)).toEqual([
          openAEVPlatformId,
        ]);
      });

      it('should create the news feed item but no provisioned records when no platforms are registered', async () => {
        await createCustomDashboardNewsFeedItem();

        const newsFeedItem = await TestHelper.newsFeed.loadFirstItem();
        expect(newsFeedItem).toBeDefined();

        const provisioned = await TestHelper.newsFeed.loadProvisioned({});
        expect(provisioned).toHaveLength(0);
      });

      it('should populate tags from use cases linked to the document', async () => {
        const platformId = uuidv4();
        // Given
        await subscribeToCustomDashboards();
        await createOpenCTIPlatformForOrganization(
          platformId,
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
        );

        const useCaseA = await useCaseDomain.insertUseCase({
          name: 'Use Case Alpha',
          color: '#FF0000',
        });
        const useCaseB = await useCaseDomain.insertUseCase({
          name: 'Use Case Beta',
          color: '#00FF00',
        });

        await objectUseCaseDomain.insertObjectUseCase({
          object_id: document.id as unknown as ObjectUseCaseObjectId,
          use_case_id: useCaseA.id,
        });
        await objectUseCaseDomain.insertObjectUseCase({
          object_id: document.id as unknown as ObjectUseCaseObjectId,
          use_case_id: useCaseB.id,
        });

        // When
        await createCustomDashboardNewsFeedItem();

        // Then
        const newsFeedItem = await TestHelper.newsFeed.loadFirstItem();
        expect(newsFeedItem).toMatchObject({
          tags: expect.arrayContaining(['Use Case Alpha', 'Use Case Beta']),
        });
      });

      it('should create a news feed item for a non-connector integration document', async () => {
        await createOpenCTIPlatformForOrganization(
          uuidv4(),
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
        );

        const integrationDocument = {
          ...document,
          integration_type: IntegrationType.CsvFeed,
        } as Document & { integration_type: IntegrationType };

        await NewsFeedApp.createResourceNewsFeedItem({
          document: integrationDocument,
          serviceDefinitionIdentifier:
            ServiceDefinitionIdentifier.OpenctiIntegrations,
        });

        const items = await TestHelper.newsFeed.loadItems();
        expect(items).toHaveLength(1);
        expect(items[0]).toMatchObject({
          type: NewsFeedItemType.ResourceIntegration,
        });
      });

      it('should not create a news feed item for a connector document', async () => {
        const connectorDocument = {
          ...document,
          integration_type: IntegrationType.Connector,
        } as Document & { integration_type: IntegrationType };

        await NewsFeedApp.createResourceNewsFeedItem({
          document: connectorDocument,
          serviceDefinitionIdentifier:
            ServiceDefinitionIdentifier.OpenctiIntegrations,
        });

        const items = await TestHelper.newsFeed.loadItems();
        expect(items).toHaveLength(0);
      });
    });

    describe('updateResourceNewsFeedItem', () => {
      const updateCustomDashboardNewsFeedItem = async () => {
        await NewsFeedApp.updateResourceNewsFeedItem({
          document,
          serviceDefinitionIdentifier:
            ServiceDefinitionIdentifier.OpenctiCustomDashboards,
        });
      };

      it('should do nothing when the service definition is not configured', async () => {
        await NewsFeedApp.createResourceNewsFeedItem({
          document,
          serviceDefinitionIdentifier:
            ServiceDefinitionIdentifier.OpenctiCustomDashboards,
        });

        await NewsFeedApp.updateResourceNewsFeedItem({
          document,
          serviceDefinitionIdentifier:
            ServiceDefinitionIdentifier.OpenctiRegistration,
        });

        const items = await TestHelper.newsFeed.loadItems();
        expect(items).toHaveLength(1);
        expect(items[0]?.title).toBe('My Custom Dashboard');
      });

      it('should do nothing when no existing news feed item is found for the document', async () => {
        await updateCustomDashboardNewsFeedItem();

        const items = await TestHelper.newsFeed.loadItems();
        expect(items).toHaveLength(0);
      });

      it.each`
        updatedName                 | expectedTitle               | description
        ${'Updated Dashboard Name'} | ${'Updated Dashboard Name'} | ${'uses the new document name when provided'}
        ${null}                     | ${'My Custom Dashboard'}    | ${'falls back to the existing title when document name is null'}
      `(
        'should update title: $description',
        async ({
          updatedName,
          expectedTitle,
        }: {
          updatedName: string | null;
          expectedTitle: string;
        }) => {
          // Given
          await NewsFeedApp.createResourceNewsFeedItem({
            document,
            serviceDefinitionIdentifier:
              ServiceDefinitionIdentifier.OpenctiCustomDashboards,
          });
          document = { ...document, name: updatedName };

          // When
          await updateCustomDashboardNewsFeedItem();

          // Then
          const updatedItem = await TestHelper.newsFeed.loadFirstItem();
          expect(updatedItem?.title).toBe(expectedTitle);
        }
      );

      it('should provision the updated news feed item to all actively registered platforms', async () => {
        const firstPlatformId = uuidv4();
        const secondPlatformId = uuidv4();
        // Given
        await subscribeToCustomDashboards();
        await createOpenCTIPlatformForOrganization(
          firstPlatformId,
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
        );
        await createOpenCTIPlatformForOrganization(
          secondPlatformId,
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
        );

        await NewsFeedApp.createResourceNewsFeedItem({
          document,
          serviceDefinitionIdentifier:
            ServiceDefinitionIdentifier.OpenctiCustomDashboards,
        });

        // Consume provisioned items so the table is empty before update
        const existingItem = await TestHelper.newsFeed.loadFirstItem();
        await TestHelper.newsFeed.loadProvisioned({
          news_feed_item_id: existingItem!.id,
        });

        // When
        await updateCustomDashboardNewsFeedItem();

        // Then
        const provisioned = await TestHelper.newsFeed.loadProvisioned({
          news_feed_item_id: existingItem!.id,
        });
        expect(provisioned).toHaveLength(2);
        expect(provisioned.map((p) => p.platform_id)).toEqual(
          expect.arrayContaining([firstPlatformId, secondPlatformId])
        );
      });

      it('should update tags from use cases linked to the document', async () => {
        const platformId = uuidv4();
        // Given
        await subscribeToCustomDashboards();
        await createOpenCTIPlatformForOrganization(
          platformId,
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
        );

        const useCaseA = await useCaseDomain.insertUseCase({
          name: 'Use Case Gamma',
          color: '#FF0000',
        });
        const useCaseB = await useCaseDomain.insertUseCase({
          name: 'Use Case Delta',
          color: '#00FF00',
        });

        await NewsFeedApp.createResourceNewsFeedItem({
          document,
          serviceDefinitionIdentifier:
            ServiceDefinitionIdentifier.OpenctiCustomDashboards,
        });

        await objectUseCaseDomain.insertObjectUseCase({
          object_id: document.id as unknown as ObjectUseCaseObjectId,
          use_case_id: useCaseA.id,
        });
        await objectUseCaseDomain.insertObjectUseCase({
          object_id: document.id as unknown as ObjectUseCaseObjectId,
          use_case_id: useCaseB.id,
        });

        // When
        await updateCustomDashboardNewsFeedItem();

        // Then
        const updatedItem = await TestHelper.newsFeed.loadFirstItem();
        expect(updatedItem).toMatchObject({
          tags: expect.arrayContaining(['Use Case Gamma', 'Use Case Delta']),
        });
      });

      it('should not provision when no platforms are registered', async () => {
        // Given
        await NewsFeedApp.createResourceNewsFeedItem({
          document,
          serviceDefinitionIdentifier:
            ServiceDefinitionIdentifier.OpenctiCustomDashboards,
        });

        // When
        await updateCustomDashboardNewsFeedItem();

        // Then
        const provisioned = await TestHelper.newsFeed.loadProvisioned({});
        expect(provisioned).toHaveLength(0);
      });

      it('should not reprovision or update a soft-deleted item linked to the document', async () => {
        const platformId = uuidv4();
        // Given
        await subscribeToCustomDashboards();
        await createOpenCTIPlatformForOrganization(
          platformId,
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
        );

        const softDeletedItem = await NewsFeedDomain.createResourceNewsFeedItem(
          {
            document,
            serviceDefinitionIdentifier:
              ServiceDefinitionIdentifier.OpenctiCustomDashboards,
            type: NewsFeedItemType.ResourceCustomDashboard,
            platformIdentifier: PlatformIdentifier.Opencti,
            tags: ['before-delete'],
          }
        );
        await NewsFeedDomain.markNewsFeedItemAsDeleted(softDeletedItem.id);
        document = { ...document, name: 'Name after delete' };

        // When
        await updateCustomDashboardNewsFeedItem();

        // Then
        const itemAfterUpdate = await TestHelper.newsFeed.loadFirstItem({
          id: softDeletedItem.id,
        });
        expect(itemAfterUpdate).toMatchObject({
          id: softDeletedItem.id,
          is_deleted: true,
          title: softDeletedItem.title,
          tags: ['before-delete'],
        });

        const provisioned = await TestHelper.newsFeed.loadProvisioned({
          news_feed_item_id: softDeletedItem.id,
        });
        expect(provisioned).toHaveLength(0);
      });

      it('should not update a news feed item for a connector document', async () => {
        const integrationDocument = {
          ...document,
          integration_type: IntegrationType.CsvFeed,
        } as Document & { integration_type: IntegrationType };

        await NewsFeedApp.createResourceNewsFeedItem({
          document: integrationDocument,
          serviceDefinitionIdentifier:
            ServiceDefinitionIdentifier.OpenctiIntegrations,
        });

        const connectorDocument = {
          ...document,
          name: 'Updated name',
          integration_type: IntegrationType.Connector,
        } as Document & { integration_type: IntegrationType };

        await NewsFeedApp.updateResourceNewsFeedItem({
          document: connectorDocument,
          serviceDefinitionIdentifier:
            ServiceDefinitionIdentifier.OpenctiIntegrations,
        });

        const items = await TestHelper.newsFeed.loadItems();
        expect(items[0]?.title).not.toBe('Updated name');
      });
    });

    describe('playbook provisioning compatibility', () => {
      const SUPPORTED_VERSION = '7.260529.0';
      const UNSUPPORTED_VERSION = '7.260512.0';

      const createPlaybookNewsFeedItem = async () => {
        await NewsFeedApp.createResourceNewsFeedItem({
          document,
          serviceDefinitionIdentifier:
            ServiceDefinitionIdentifier.OpenctiPlaybooks,
        });
      };

      const loadProvisionedForCreatedItem = async () => {
        const newsFeedItem = await TestHelper.newsFeed.loadFirstItem();
        expect(newsFeedItem).toBeDefined();
        return TestHelper.newsFeed.loadProvisioned({
          news_feed_item_id: newsFeedItem!.id,
        });
      };

      it('should provision to a platform on a supported version', async () => {
        const platformId = uuidv4();
        await subscribeToPlaybooks();
        await createOpenCTIPlatformForOrganization(
          platformId,
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          { platform_version: SUPPORTED_VERSION }
        );

        await createPlaybookNewsFeedItem();

        const provisioned = await loadProvisionedForCreatedItem();
        expect(provisioned).toHaveLength(1);
        expect(provisioned[0]?.platform_id).toBe(platformId);
      });

      it('should provision to a Community Edition platform on a supported version', async () => {
        const platformId = uuidv4();
        await subscribeToPlaybooks();
        await createOpenCTIPlatformForOrganization(
          platformId,
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          {
            platform_version: SUPPORTED_VERSION,
            platform_contract: PlatformContract.Ce,
          }
        );

        await createPlaybookNewsFeedItem();

        const provisioned = await loadProvisionedForCreatedItem();
        expect(provisioned).toHaveLength(1);
        expect(provisioned[0]?.platform_id).toBe(platformId);
      });

      it.each`
        version         | description
        ${'7.260526.0'} | ${'just below the supported version'}
        ${'6.8.0'}      | ${'an older major.minor version'}
        ${'1.0.0'}      | ${'a far older version'}
      `(
        'should not provision to a platform with $description ($version)',
        async ({ version }: { version: string }) => {
          await subscribeToPlaybooks();
          await createOpenCTIPlatformForOrganization(
            uuidv4(),
            TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
            { platform_version: version }
          );

          await createPlaybookNewsFeedItem();

          const provisioned = await loadProvisionedForCreatedItem();
          expect(provisioned).toHaveLength(0);
        }
      );

      it('should only provision to the supported platforms among several', async () => {
        const supportedPlatformId = uuidv4();
        await subscribeToPlaybooks();
        await createOpenCTIPlatformForOrganization(
          supportedPlatformId,
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          { platform_version: SUPPORTED_VERSION }
        );
        await createOpenCTIPlatformForOrganization(
          uuidv4(),
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          { platform_version: UNSUPPORTED_VERSION }
        );

        await createPlaybookNewsFeedItem();

        const provisioned = await loadProvisionedForCreatedItem();
        expect(provisioned).toHaveLength(1);
        expect(provisioned[0]?.platform_id).toBe(supportedPlatformId);
      });

      it('should provision a deletion to supported platforms but skip unsupported versions', async () => {
        const supportedPlatformId = uuidv4();
        const unsupportedPlatformId = uuidv4();
        await createOpenCTIPlatformForOrganization(
          supportedPlatformId,
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          { platform_version: SUPPORTED_VERSION }
        );
        await createOpenCTIPlatformForOrganization(
          unsupportedPlatformId,
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          { platform_version: UNSUPPORTED_VERSION }
        );

        const item = await NewsFeedDomain.createResourceNewsFeedItem({
          document,
          serviceDefinitionIdentifier:
            ServiceDefinitionIdentifier.OpenctiPlaybooks,
          type: NewsFeedItemType.ResourcePlaybook,
          platformIdentifier: PlatformIdentifier.Opencti,
          tags: [],
        });

        await NewsFeedApp.deleteNewsFeedItem({ newsFeedItemId: item.id });

        const provisioned = await TestHelper.newsFeed.loadProvisioned({
          news_feed_item_id: item.id,
        });
        const provisionedPlatformIds = provisioned.map((p) => p.platform_id);
        expect(provisionedPlatformIds).toContain(supportedPlatformId);
        expect(provisionedPlatformIds).not.toContain(unsupportedPlatformId);
      });
    });

    describe('deleteResourceNewsFeed', () => {
      it.each`
        serviceDefinitionIdentifier                            | type                                        | platformIdentifier
        ${ServiceDefinitionIdentifier.OpenaevScenarios}        | ${NewsFeedItemType.ResourceScenario}        | ${PlatformIdentifier.Openaev}
        ${ServiceDefinitionIdentifier.OpenctiCustomDashboards} | ${NewsFeedItemType.ResourceCustomDashboard} | ${PlatformIdentifier.Opencti}
      `(
        'should mark the $type news feed item as deleted when the document has one',
        async ({
          serviceDefinitionIdentifier,
          type,
          platformIdentifier,
        }: {
          serviceDefinitionIdentifier: ServiceDefinitionIdentifier;
          type: NewsFeedItemType;
          platformIdentifier: PlatformIdentifier;
        }) => {
          // Given
          const item = await NewsFeedDomain.createResourceNewsFeedItem({
            document,
            serviceDefinitionIdentifier,
            type,
            platformIdentifier,
            tags: [],
          });

          // When
          await NewsFeedApp.deleteResourceNewsFeed({
            documentId: document.id,
          });

          // Then
          const deletedItem = await TestHelper.newsFeed.loadFirstItem({
            id: item.id,
          });
          expect(deletedItem?.is_deleted).toBe(true);
        }
      );

      it('should log the failure instead of throwing when the deletion fails', async () => {
        // Given
        const error = new Error('delete-failed');
        vi.spyOn(
          NewsFeedDomain,
          'loadNewsFeedItemByDocumentId'
        ).mockRejectedValue(error);
        const logErrorSpy = vi.spyOn(logApp, 'error').mockImplementation(() => {
          return;
        });

        // When
        await NewsFeedApp.deleteResourceNewsFeed({
          documentId: document.id,
        });

        // Then
        expect(logErrorSpy).toHaveBeenCalledWith(
          'Unable to delete news feed item',
          { error, documentId: document.id }
        );
      });
    });

    describe('upsertResourceNewsFeed', () => {
      it('should do nothing when the service definition is not configured', async () => {
        // Given
        vi.spyOn(NewsFeedHelper, 'getNewsFeedConfiguration').mockReturnValue(
          undefined
        );
        const createResourceNewsFeedItemSpy = vi
          .spyOn(NewsFeedApp, 'createResourceNewsFeedItem')
          .mockResolvedValue();
        const updateResourceNewsFeedItemSpy = vi
          .spyOn(NewsFeedApp, 'updateResourceNewsFeedItem')
          .mockResolvedValue();

        // When
        await NewsFeedApp.upsertResourceNewsFeed({
          documentBeforeUpdate: undefined,
          updatedDocument: { ...document, active: true },
          serviceDefinitionIdentifier:
            ServiceDefinitionIdentifier.OpenctiIntegrations,
        });

        // Then
        expect(createResourceNewsFeedItemSpy).not.toHaveBeenCalled();
        expect(updateResourceNewsFeedItemSpy).not.toHaveBeenCalled();
      });

      it('should create a news feed item when document is created as active', async () => {
        // Given
        vi.spyOn(NewsFeedHelper, 'getNewsFeedConfiguration').mockReturnValue({
          newsFeedType: NewsFeedItemType.ResourceCustomDashboard,
          platformIdentifier: PlatformIdentifier.Opencti,
        });
        const createResourceNewsFeedItemSpy = vi
          .spyOn(NewsFeedApp, 'createResourceNewsFeedItem')
          .mockResolvedValue();
        const updateResourceNewsFeedItemSpy = vi
          .spyOn(NewsFeedApp, 'updateResourceNewsFeedItem')
          .mockResolvedValue();

        const updatedDocument = { ...document, active: true };

        // When
        await NewsFeedApp.upsertResourceNewsFeed({
          documentBeforeUpdate: undefined,
          updatedDocument,
          serviceDefinitionIdentifier:
            ServiceDefinitionIdentifier.OpenctiCustomDashboards,
        });

        // Then
        expect(createResourceNewsFeedItemSpy).toHaveBeenCalledOnce();
        expect(createResourceNewsFeedItemSpy).toHaveBeenCalledWith({
          document: updatedDocument,
          serviceDefinitionIdentifier:
            ServiceDefinitionIdentifier.OpenctiCustomDashboards,
        });
        expect(updateResourceNewsFeedItemSpy).not.toHaveBeenCalled();
      });

      it('should update the existing news feed item when document stays active', async () => {
        // Given
        vi.spyOn(NewsFeedHelper, 'getNewsFeedConfiguration').mockReturnValue({
          newsFeedType: NewsFeedItemType.ResourceCustomDashboard,
          platformIdentifier: PlatformIdentifier.Opencti,
        });
        const createResourceNewsFeedItemSpy = vi
          .spyOn(NewsFeedApp, 'createResourceNewsFeedItem')
          .mockResolvedValue();
        const updateResourceNewsFeedItemSpy = vi
          .spyOn(NewsFeedApp, 'updateResourceNewsFeedItem')
          .mockResolvedValue();

        const updatedDocument = { ...document, active: true };

        // When
        await NewsFeedApp.upsertResourceNewsFeed({
          documentBeforeUpdate: { ...document, active: true },
          updatedDocument,
          serviceDefinitionIdentifier:
            ServiceDefinitionIdentifier.OpenctiCustomDashboards,
        });

        // Then
        expect(updateResourceNewsFeedItemSpy).toHaveBeenCalledOnce();
        expect(updateResourceNewsFeedItemSpy).toHaveBeenCalledWith({
          document: updatedDocument,
          serviceDefinitionIdentifier:
            ServiceDefinitionIdentifier.OpenctiCustomDashboards,
        });
        expect(createResourceNewsFeedItemSpy).not.toHaveBeenCalled();
      });

      it('should do nothing when updated document stays inactive', async () => {
        // Given
        vi.spyOn(NewsFeedHelper, 'getNewsFeedConfiguration').mockReturnValue({
          newsFeedType: NewsFeedItemType.ResourceCustomDashboard,
          platformIdentifier: PlatformIdentifier.Opencti,
        });
        const createResourceNewsFeedItemSpy = vi
          .spyOn(NewsFeedApp, 'createResourceNewsFeedItem')
          .mockResolvedValue();
        const updateResourceNewsFeedItemSpy = vi
          .spyOn(NewsFeedApp, 'updateResourceNewsFeedItem')
          .mockResolvedValue();
        const deleteResourceNewsFeedSpy = vi
          .spyOn(NewsFeedApp, 'deleteResourceNewsFeed')
          .mockResolvedValue();

        // When
        await NewsFeedApp.upsertResourceNewsFeed({
          documentBeforeUpdate: { ...document, active: false },
          updatedDocument: { ...document, active: false },
          serviceDefinitionIdentifier:
            ServiceDefinitionIdentifier.OpenctiCustomDashboards,
        });

        // Then
        expect(createResourceNewsFeedItemSpy).not.toHaveBeenCalled();
        expect(updateResourceNewsFeedItemSpy).not.toHaveBeenCalled();
        expect(deleteResourceNewsFeedSpy).not.toHaveBeenCalled();
      });

      it('should delete the news feed item when the document is unpublished', async () => {
        // Given
        vi.spyOn(NewsFeedHelper, 'getNewsFeedConfiguration').mockReturnValue({
          newsFeedType: NewsFeedItemType.ResourceScenario,
          platformIdentifier: PlatformIdentifier.Openaev,
        });
        const updateResourceNewsFeedItemSpy = vi
          .spyOn(NewsFeedApp, 'updateResourceNewsFeedItem')
          .mockResolvedValue();
        const deleteResourceNewsFeedSpy = vi
          .spyOn(NewsFeedApp, 'deleteResourceNewsFeed')
          .mockResolvedValue();

        // When
        await NewsFeedApp.upsertResourceNewsFeed({
          documentBeforeUpdate: { ...document, active: true },
          updatedDocument: { ...document, active: false },
          serviceDefinitionIdentifier:
            ServiceDefinitionIdentifier.OpenaevScenarios,
        });

        // Then
        expect(deleteResourceNewsFeedSpy).toHaveBeenCalledOnce();
        expect(deleteResourceNewsFeedSpy).toHaveBeenCalledWith({
          documentId: document.id,
        });
        expect(updateResourceNewsFeedItemSpy).not.toHaveBeenCalled();
      });

      it('should log creation failure message when create branch fails during creation flow', async () => {
        // Given
        const error = new Error('create-failed');
        vi.spyOn(NewsFeedHelper, 'getNewsFeedConfiguration').mockReturnValue({
          newsFeedType: NewsFeedItemType.ResourceCustomDashboard,
          platformIdentifier: PlatformIdentifier.Opencti,
        });
        vi.spyOn(NewsFeedApp, 'createResourceNewsFeedItem').mockRejectedValue(
          error
        );
        const logErrorSpy = vi.spyOn(logApp, 'error').mockImplementation(() => {
          return;
        });

        // When
        await NewsFeedApp.upsertResourceNewsFeed({
          documentBeforeUpdate: undefined,
          updatedDocument: { ...document, active: true },
          serviceDefinitionIdentifier:
            ServiceDefinitionIdentifier.OpenctiCustomDashboards,
        });

        // Then
        expect(logErrorSpy).toHaveBeenCalledWith(
          'Unable to create news feed item',
          {
            error,
            documentId: document.id,
            source: 'creation',
          }
        );
      });

      it('should log update-branch failure message when update fails during update flow', async () => {
        // Given
        const error = new Error('update-failed');
        vi.spyOn(NewsFeedHelper, 'getNewsFeedConfiguration').mockReturnValue({
          newsFeedType: NewsFeedItemType.ResourceCustomDashboard,
          platformIdentifier: PlatformIdentifier.Opencti,
        });
        vi.spyOn(NewsFeedApp, 'updateResourceNewsFeedItem').mockRejectedValue(
          error
        );
        const logErrorSpy = vi.spyOn(logApp, 'error').mockImplementation(() => {
          return;
        });

        // When
        await NewsFeedApp.upsertResourceNewsFeed({
          documentBeforeUpdate: { ...document, active: true },
          updatedDocument: { ...document, active: true },
          serviceDefinitionIdentifier:
            ServiceDefinitionIdentifier.OpenctiCustomDashboards,
        });

        // Then
        expect(logErrorSpy).toHaveBeenCalledWith(
          'Unable to update news feed item',
          {
            error,
            documentId: document.id,
            source: 'update',
          }
        );
      });
    });
  });

  describe('cleanExpiredNewsFeedItems', () => {
    const monthsAgo = (months: number): Date => {
      const date = new Date();
      date.setMonth(date.getMonth() - months);
      return date;
    };

    afterEach(async () => {
      await TestHelper.newsFeed.deleteItem();
      mockConfigGet.mockReset();
    });

    it('should delete items older than configured interval and keep recent ones', async () => {
      // Given
      const oldItem = await TestHelper.newsFeed.createItem({
        type: NewsFeedItemType.ResourceCustomDashboard,
        platform_identifier: PlatformIdentifier.Opencti,
        title: 'old item',
        creation_date: monthsAgo(7),
        tags: [],
      });
      const recentItem = await TestHelper.newsFeed.createItem({
        type: NewsFeedItemType.ResourceCustomDashboard,
        platform_identifier: PlatformIdentifier.Opencti,
        title: 'recent item',
        creation_date: monthsAgo(1),
        tags: [],
      });

      // When
      await NewsFeedApp.cleanExpiredNewsFeedItems();

      // Then
      const remaining = await TestHelper.newsFeed.loadItems();
      const remainingIds = remaining.map((i) => i.id);
      expect(remainingIds).not.toContain(oldItem.id);
      expect(remainingIds).toContain(recentItem.id);
    });

    it('should keep the active blogposts, whatever their publication date', async () => {
      // Given
      const activeBlogpost = await TestHelper.newsFeed.createItem({
        type: NewsFeedItemType.BlogPost,
        platform_identifier: PlatformIdentifier.Opencti,
        title: 'old active blogpost',
        creation_date: monthsAgo(7),
        tags: [],
      });
      const droppedBlogpost = await TestHelper.newsFeed.createItem({
        type: NewsFeedItemType.BlogPost,
        platform_identifier: PlatformIdentifier.Opencti,
        title: 'old dropped blogpost',
        creation_date: monthsAgo(7),
        is_deleted: true,
        tags: [],
      });

      // When
      await NewsFeedApp.cleanExpiredNewsFeedItems();

      // Then
      const remainingIds = (await TestHelper.newsFeed.loadItems()).map(
        (item) => item.id
      );
      expect(remainingIds).toContain(activeBlogpost.id);
      expect(remainingIds).not.toContain(droppedBlogpost.id);
    });

    it('should not throw when no items exist', async () => {
      await expect(
        NewsFeedApp.cleanExpiredNewsFeedItems()
      ).resolves.not.toThrow();
    });

    it('should throw when cleanup_interval_value is not a positive number', async () => {
      mockConfigGet.mockImplementation((key: string) => {
        if (key === 'news_feed.cleanup_interval_value') return 'not-a-number';
        if (key === 'news_feed.cleanup_interval_unit') return 'days';
        return undefined;
      });

      await expect(NewsFeedApp.cleanExpiredNewsFeedItems()).rejects.toThrow(
        /Invalid config "news_feed.cleanup_interval_value"/
      );
    });

    it('should throw when cleanup_interval_unit is not a supported unit', async () => {
      mockConfigGet.mockImplementation((key: string) => {
        if (key === 'news_feed.cleanup_interval_value') return 30;
        if (key === 'news_feed.cleanup_interval_unit') return 'weeks';
        return undefined;
      });

      await expect(NewsFeedApp.cleanExpiredNewsFeedItems()).rejects.toThrow(
        /Invalid config "news_feed.cleanup_interval_unit"/
      );
    });
  });

  describe('deleteNewsFeedItem', () => {
    beforeEach(() => {
      requestContext.set(requestContextSimpleUserSecondOrga);
    });

    afterEach(async () => {
      await TestHelper.newsFeed.deleteItem();
      await cleanupCreatedServiceInstances();
    });

    it('should throw when the news feed item does not exist', async () => {
      await expect(
        NewsFeedApp.deleteNewsFeedItem({ newsFeedItemId: uuidv4() })
      ).rejects.toThrow(ErrorCode.NewsFeedItemNotFound);
    });

    it.each`
      description                 | isDeleted
      ${'a live blog post'}       | ${false}
      ${'an already deleted one'} | ${true}
    `(
      'should refuse to delete $description and leave it untouched',
      async ({ isDeleted }: { isDeleted: boolean }) => {
        // Given
        const platformId = uuidv4();
        await createOpenCTIPlatformForOrganization(
          platformId,
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
        );
        const item = await TestHelper.newsFeed.createItem({
          type: NewsFeedItemType.BlogPost,
          platform_identifier: PlatformIdentifier.Opencti,
          title: 'Blog post to keep',
          is_deleted: isDeleted,
        });

        // When
        const call = NewsFeedApp.deleteNewsFeedItem({
          newsFeedItemId: item.id,
        });

        // Then
        await expect(call).rejects.toThrow(
          ErrorCode.CantDeleteBlogpostNewsFeedItem
        );
        expect(
          await TestHelper.newsFeed.loadFirstItem({ id: item.id })
        ).toMatchObject({ id: item.id, is_deleted: isDeleted });
        expect(
          await TestHelper.newsFeed.loadProvisioned({
            news_feed_item_id: item.id,
          })
        ).toHaveLength(0);
      }
    );

    it('should mark the news feed item as deleted', async () => {
      // Given
      const item = await TestHelper.newsFeed.createItem({
        type: NewsFeedItemType.ResourceCustomDashboard,
        platform_identifier: PlatformIdentifier.Opencti,
        title: 'Dashboard to delete',
        creation_date: new Date(),
        tags: [],
      });

      // When
      await NewsFeedApp.deleteNewsFeedItem({ newsFeedItemId: item.id });

      // Then
      const updated = await TestHelper.newsFeed.loadFirstItem({ id: item.id });
      expect(updated?.is_deleted).toBe(true);
    });

    it('should provision the deleted item to all registered OpenCTI platforms', async () => {
      const firstPlatformId = uuidv4();
      const secondPlatformId = uuidv4();
      // Given
      await createOpenCTIPlatformForOrganization(
        firstPlatformId,
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
      );
      await createOpenCTIPlatformForOrganization(
        secondPlatformId,
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
      );
      const item = await TestHelper.newsFeed.createItem({
        type: NewsFeedItemType.ResourceCustomDashboard,
        platform_identifier: PlatformIdentifier.Opencti,
        title: 'Dashboard to delete',
        creation_date: new Date(),
        tags: [],
      });

      // When
      await NewsFeedApp.deleteNewsFeedItem({ newsFeedItemId: item.id });

      // Then
      const provisioned = await TestHelper.newsFeed.loadProvisioned({
        news_feed_item_id: item.id,
      });
      expect(provisioned).toHaveLength(2);
      expect(provisioned.map((p) => p.platform_id)).toEqual(
        expect.arrayContaining([firstPlatformId, secondPlatformId])
      );
    });

    it('should not provision when no registered platforms exist', async () => {
      // Given
      const item = await TestHelper.newsFeed.createItem({
        type: NewsFeedItemType.ResourceCustomDashboard,
        platform_identifier: PlatformIdentifier.Opencti,
        title: 'Dashboard with no platforms',
        creation_date: new Date(),
        tags: [],
      });

      // When
      await NewsFeedApp.deleteNewsFeedItem({ newsFeedItemId: item.id });

      // Then
      const provisioned = await TestHelper.newsFeed.loadProvisioned({
        news_feed_item_id: item.id,
      });
      expect(provisioned).toHaveLength(0);
    });

    it('should provision the deleted item to a platform belonging to a different organization than the context one', async () => {
      const otherOrganizationPlatformId = uuidv4();
      // Given — context is SECOND_ORGANIZATION, but the platform is registered under FILIGRAN
      await createOpenCTIPlatformForOrganization(
        otherOrganizationPlatformId,
        TEST_ORGANIZATIONS.FILIGRAN.ID
      );
      const item = await TestHelper.newsFeed.createItem({
        type: NewsFeedItemType.ResourceCustomDashboard,
        platform_identifier: PlatformIdentifier.Opencti,
        title: 'Dashboard for other org',
        creation_date: new Date(),
        tags: [],
      });

      // When
      await NewsFeedApp.deleteNewsFeedItem({ newsFeedItemId: item.id });

      // Then — the item is provisioned cross-org because deleteNewsFeedItem targets all registered platforms
      const provisioned = await TestHelper.newsFeed.loadProvisioned({
        news_feed_item_id: item.id,
      });
      expect(provisioned).toHaveLength(1);
      expect(provisioned[0]?.platform_id).toBe(otherOrganizationPlatformId);
    });
  });
  describe('resolveExternalRedirect', () => {
    const BLOG_POST_SLUG = 'threat-report-2026';
    const BLOG_POST_URL = `${config.get<string>('blog_api.base_url')}/blog/${BLOG_POST_SLUG}`;
    const PLATFORM_ID = '9b0c7a3e-1111-4a9e-8d6f-0d4f5a7c9e10';

    const createBlogPostItem = async ({
      slug,
      isDeleted = false,
      type = NewsFeedItemType.BlogPost,
    }: {
      slug?: string;
      isDeleted?: boolean;
      type?: NewsFeedItemType;
    } = {}) => {
      const item = await TestHelper.newsFeed.createItem({
        type,
        title: 'Blog post',
        is_deleted: isDeleted,
      });
      if (slug !== undefined) {
        await TestHelper.newsFeed.createMetadata({
          news_feed_item_id: item.id,
          key: NewsFeedItemMetadataKey.BlogPostSlug,
          value: slug,
        });
      }
      return item;
    };

    afterEach(async () => {
      await TestHelper.newsFeed.deleteItem();
    });

    it('should resolve the blog destination of a blog post item', async () => {
      // Given
      const item = await createBlogPostItem({ slug: BLOG_POST_SLUG });

      // When
      const result = await NewsFeedApp.resolveExternalRedirect({
        newsFeedItemId: item.id,
        query: {},
      });

      // Then
      expect(result).toEqual({
        newsFeedItemId: item.id,
        newsFeedItemType: NewsFeedItemType.BlogPost,
        host: new URL(config.get<string>('blog_api.base_url')).hostname,
        url: BLOG_POST_URL,
      });
    });

    it('should forward the utm parameters only, never platform_id nor any other parameter', async () => {
      // Given
      const item = await createBlogPostItem({ slug: BLOG_POST_SLUG });

      // When
      const result = await NewsFeedApp.resolveExternalRedirect({
        newsFeedItemId: item.id,
        query: {
          utm_source: 'opencti',
          utm_medium: 'newsfeed',
          utm_campaign: 'blog_posts',
          utm_content: 'blog_posts',
          platform_id: PLATFORM_ID,
          next: 'https://evil.example',
        },
      });

      // Then
      expect(result?.url).toBe(
        `${BLOG_POST_URL}?utm_source=opencti&utm_medium=newsfeed&utm_campaign=blog_posts&utm_content=blog_posts`
      );
    });

    it.each([
      ['a malformed id', 'not-a-uuid'],
      ['an id with a path', '../../etc/passwd'],
      ['an unknown item', '3f8d0c1e-2b7a-4d65-8e19-5a4c6b7d8e90'],
    ])('should not resolve %s', async (_description, newsFeedItemId) => {
      // When
      const result = await NewsFeedApp.resolveExternalRedirect({
        newsFeedItemId,
        query: {},
      });

      // Then
      expect(result).toBeUndefined();
    });

    // The unsafe slugs are exhaustively covered by the redirect helper tests
    it.each([
      [
        'a deleted item',
        () => createBlogPostItem({ slug: BLOG_POST_SLUG, isDeleted: true }),
      ],
      [
        'an item whose type has no destination builder',
        () =>
          createBlogPostItem({
            slug: BLOG_POST_SLUG,
            type: NewsFeedItemType.ResourcePlaybook,
          }),
      ],
      [
        'an item without the blog_post_slug metadata',
        () => createBlogPostItem(),
      ],
      [
        'an item with an unsafe blog_post_slug',
        () => createBlogPostItem({ slug: 'a/b' }),
      ],
    ])('should not resolve %s', async (_description, createItem) => {
      // Given
      const item = await createItem();

      // When
      const result = await NewsFeedApp.resolveExternalRedirect({
        newsFeedItemId: item.id,
        query: {},
      });

      // Then
      expect(result).toBeUndefined();
    });
  });

  describe('syncBlogposts', () => {
    const SUPPORTED_VERSION = '7.260529.0';
    const ABOVE_VERSION = '7.260601.0';
    const BELOW_VERSION = '7.260101.0';

    // The higher the number, the older the post: post 1 is the newest
    const buildPost = (
      number: number,
      overrides: Partial<BlogFeedItem> = {}
    ): BlogFeedItem => ({
      id: `post-${number}`,
      slug: `blog-post-${number}`,
      title: `Blog post ${number}`,
      summary: `Summary of the blog post ${number}`,
      image: {
        url: `https://filigran.io/api/media/file/blog-post-${number}.png`,
        alt: `Image of the blog post ${number}`,
      },
      authors: [{ name: 'Romain Guignard' }],
      categories: [
        { slug: 'threat-intelligence', label: 'Threat Intelligence' },
      ],
      products: ['opencti'],
      read_minutes: 7,
      published_at: new Date(Date.UTC(2026, 8, 30 - number, 8)).toISOString(),
      ...overrides,
    });
    const buildFeed = (...numbers: number[]): BlogFeedItem[] =>
      numbers.map((number) => buildPost(number));

    // Saved once and restored in afterEach, so that a failing test cannot leak the override
    const originalBlogpostSupport =
      RequiredPlatformVersions.NewsFeedBlogpostSupport;
    const setRequiredBlogpostVersion = (requiredVersion: string | null) => {
      RequiredPlatformVersions.NewsFeedBlogpostSupport = {
        [PlatformIdentifier.Opencti]: requiredVersion,
        [PlatformIdentifier.Openaev]: null,
        [PlatformIdentifier.Xtmone]: null,
      };
    };

    let fetchBlogFeedSpy: MockInstance<typeof BlogApiClient.fetchBlogFeed>;
    let provisionSpy:
      MockInstance<typeof NewsFeedDomain.provisionNewsFeedItem> | undefined;

    const mockFeed = (posts: BlogFeedItem[]) =>
      fetchBlogFeedSpy.mockResolvedValue(posts);

    const loadBlogpostItem = async (slug: string) => {
      const [slugMetadata] = await TestHelper.newsFeed.loadMetadata({
        key: NewsFeedItemMetadataKey.BlogPostSlug,
        value: slug,
      });
      if (!slugMetadata) {
        return undefined;
      }
      return TestHelper.newsFeed.loadFirstItem({
        id: slugMetadata.news_feed_item_id,
      });
    };

    const loadMetadataValues = async (newsFeedItemId: NewsFeedItemId) => {
      const metadata = await TestHelper.newsFeed.loadMetadata({
        news_feed_item_id: newsFeedItemId,
      });
      return Object.fromEntries(metadata.map(({ key, value }) => [key, value]));
    };

    // Everything the sync writes, in a stable order, to compare two states of the database
    const loadBlogpostState = async () => {
      const items = await TestHelper.newsFeed.loadItems({
        type: NewsFeedItemType.BlogPost,
      });
      const state = await Promise.all(
        items.map(async (item) => ({
          item,
          metadata: await loadMetadataValues(item.id),
          provisioned: (
            await TestHelper.newsFeed.loadProvisioned({
              news_feed_item_id: item.id,
            })
          )
            .map(({ platform_id }) => platform_id)
            .sort(),
        }))
      );
      return state.sort((a, b) => a.item.title.localeCompare(b.item.title));
    };

    beforeEach(() => {
      fetchBlogFeedSpy = vi.spyOn(BlogApiClient, 'fetchBlogFeed');
      setRequiredBlogpostVersion(SUPPORTED_VERSION);
    });

    afterEach(async () => {
      RequiredPlatformVersions.NewsFeedBlogpostSupport =
        originalBlogpostSupport;
      fetchBlogFeedSpy.mockRestore();
      provisionSpy?.mockRestore();
      provisionSpy = undefined;
      await TestHelper.newsFeed.deleteItem();
      await cleanupCreatedServiceInstances();
    });

    it('should ask the blog API for the newest posts of the mapped product', async () => {
      // Given
      mockFeed([]);

      // When
      await NewsFeedApp.syncBlogposts();

      // Then
      expect(fetchBlogFeedSpy).toHaveBeenCalledTimes(1);
      expect(fetchBlogFeedSpy).toHaveBeenCalledWith({
        product: 'opencti',
        limit: 6,
      });
    });

    it('should import the posts of the first call as blogpost items', async () => {
      // Given
      mockFeed(buildFeed(1, 2, 3));

      // When
      const result = await NewsFeedApp.syncBlogposts();

      // Then
      expect(result).toEqual({
        created: 3,
        updated: 0,
        dropped: 0,
        provisionedPlatforms: 0,
      });
      expect(await TestHelper.newsFeed.loadItems()).toHaveLength(3);
      const firstPost = buildPost(1);
      const firstItem = await loadBlogpostItem(firstPost.slug);
      expect(firstItem).toMatchObject({
        type: NewsFeedItemType.BlogPost,
        platform_identifier: PlatformIdentifier.Opencti,
        title: 'Blog post 1',
        creation_date: new Date(firstPost.published_at),
        tags: ['Threat Intelligence'],
        is_deleted: false,
      });
      expect(await loadMetadataValues(firstItem!.id)).toEqual({
        [NewsFeedItemMetadataKey.UrlPath]: NewsFeedHelper.buildRedirectUrlPath(
          firstItem!.id
        ),
        [NewsFeedItemMetadataKey.Description]: 'Summary of the blog post 1',
        [NewsFeedItemMetadataKey.ImageUrl]:
          'https://filigran.io/api/media/file/blog-post-1.png',
        [NewsFeedItemMetadataKey.ImageAlt]: 'Image of the blog post 1',
        [NewsFeedItemMetadataKey.AuthorNames]: '["Romain Guignard"]',
        [NewsFeedItemMetadataKey.ReadMinutes]: '7',
        [NewsFeedItemMetadataKey.BlogPostSlug]: 'blog-post-1',
      });
    });

    it('should keep the distinct category labels as tags', async () => {
      // Given
      mockFeed([
        buildPost(1, {
          categories: [
            { slug: 'threat-intelligence', label: 'Threat Intelligence' },
            { slug: 'partnership', label: 'Partnership' },
            { slug: 'threat-intel', label: 'Threat Intelligence' },
          ],
        }),
      ]);

      // When
      await NewsFeedApp.syncBlogposts();

      // Then
      const item = await loadBlogpostItem('blog-post-1');
      expect(item?.tags).toEqual(['Threat Intelligence', 'Partnership']);
    });

    it('should omit the metadata that the post does not have', async () => {
      // Given
      mockFeed([
        buildPost(1, {
          summary: '',
          image: null,
          authors: [],
          read_minutes: null,
          categories: [],
        }),
      ]);

      // When
      await NewsFeedApp.syncBlogposts();

      // Then
      const item = await loadBlogpostItem('blog-post-1');
      expect(item?.tags).toEqual([]);
      expect(await loadMetadataValues(item!.id)).toEqual({
        [NewsFeedItemMetadataKey.UrlPath]: NewsFeedHelper.buildRedirectUrlPath(
          item!.id
        ),
        [NewsFeedItemMetadataKey.BlogPostSlug]: 'blog-post-1',
      });
    });

    it('should store the names of all the authors as a JSON array', async () => {
      // Given
      mockFeed([
        buildPost(1, {
          authors: [{ name: 'Romain Guignard' }, { name: 'Ada Lovelace' }],
        }),
      ]);

      // When
      await NewsFeedApp.syncBlogposts();

      // Then
      const item = await loadBlogpostItem('blog-post-1');
      const metadata = await loadMetadataValues(item!.id);
      expect(metadata[NewsFeedItemMetadataKey.AuthorNames]).toBe(
        '["Romain Guignard","Ada Lovelace"]'
      );
    });

    it('should add a new post and keep the existing ones', async () => {
      // Given
      mockFeed(buildFeed(2, 3));
      await NewsFeedApp.syncBlogposts();
      const existingItem = await loadBlogpostItem('blog-post-2');
      mockFeed(buildFeed(1, 2, 3));

      // When
      const result = await NewsFeedApp.syncBlogposts();

      // Then
      expect(result).toMatchObject({ created: 1, updated: 2, dropped: 0 });
      expect(await TestHelper.newsFeed.loadItems()).toHaveLength(3);
      expect(await loadBlogpostItem('blog-post-2')).toMatchObject({
        id: existingItem!.id,
        is_deleted: false,
      });
      expect(await loadBlogpostItem('blog-post-1')).toMatchObject({
        title: 'Blog post 1',
        is_deleted: false,
      });
    });

    it('should rewrite an updated post, including the metadata that disappeared', async () => {
      // Given
      mockFeed(buildFeed(1, 2));
      await NewsFeedApp.syncBlogposts();
      const existingItem = await loadBlogpostItem('blog-post-1');
      mockFeed([
        buildPost(1, {
          title: 'A new title',
          summary: 'A new summary',
          image: null,
          authors: [],
          read_minutes: 9,
          categories: [{ slug: 'partnership', label: 'Partnership' }],
        }),
        buildPost(2),
      ]);

      // When
      const result = await NewsFeedApp.syncBlogposts();

      // Then
      expect(result).toMatchObject({ created: 0, updated: 2, dropped: 0 });
      expect(await loadBlogpostItem('blog-post-1')).toMatchObject({
        id: existingItem!.id,
        title: 'A new title',
        tags: ['Partnership'],
        is_deleted: false,
      });
      expect(await loadMetadataValues(existingItem!.id)).toEqual({
        [NewsFeedItemMetadataKey.UrlPath]: NewsFeedHelper.buildRedirectUrlPath(
          existingItem!.id
        ),
        [NewsFeedItemMetadataKey.Description]: 'A new summary',
        [NewsFeedItemMetadataKey.ReadMinutes]: '9',
        [NewsFeedItemMetadataKey.BlogPostSlug]: 'blog-post-1',
      });
    });

    it('should drop the post that leaves the latest posts when a 7th post appears', async () => {
      // Given
      mockFeed(buildFeed(1, 2, 3, 4, 5, 6));
      await NewsFeedApp.syncBlogposts();
      mockFeed(buildFeed(0, 1, 2, 3, 4, 5));

      // When
      const result = await NewsFeedApp.syncBlogposts();

      // Then
      expect(result).toMatchObject({ created: 1, updated: 5, dropped: 1 });
      expect(await loadBlogpostItem('blog-post-6')).toMatchObject({
        is_deleted: true,
      });
      const activeItems = await TestHelper.newsFeed.loadItems({
        is_deleted: false,
      });
      expect(activeItems.map(({ title }) => title).sort()).toEqual([
        'Blog post 0',
        'Blog post 1',
        'Blog post 2',
        'Blog post 3',
        'Blog post 4',
        'Blog post 5',
      ]);
    });

    it('should drop an unpublished post and keep its metadata for a later restore', async () => {
      // Given
      mockFeed(buildFeed(1, 2, 3));
      await NewsFeedApp.syncBlogposts();
      mockFeed(buildFeed(1, 3));

      // When
      const result = await NewsFeedApp.syncBlogposts();

      // Then
      expect(result).toMatchObject({ created: 0, updated: 2, dropped: 1 });
      const droppedItem = await loadBlogpostItem('blog-post-2');
      expect(droppedItem).toMatchObject({ is_deleted: true });
      expect(await loadMetadataValues(droppedItem!.id)).toMatchObject({
        [NewsFeedItemMetadataKey.BlogPostSlug]: 'blog-post-2',
      });
    });

    it('should restore a post that returns instead of creating a new item', async () => {
      // Given
      mockFeed(buildFeed(1, 2, 3));
      await NewsFeedApp.syncBlogposts();
      const initialItem = await loadBlogpostItem('blog-post-2');
      mockFeed(buildFeed(1, 3));
      await NewsFeedApp.syncBlogposts();
      mockFeed([
        buildPost(1),
        buildPost(2, { title: 'Back again' }),
        buildPost(3),
      ]);

      // When
      const result = await NewsFeedApp.syncBlogposts();

      // Then
      expect(result).toMatchObject({ created: 0, updated: 3, dropped: 0 });
      expect(await TestHelper.newsFeed.loadItems()).toHaveLength(3);
      expect(await loadBlogpostItem('blog-post-2')).toMatchObject({
        id: initialItem!.id,
        title: 'Back again',
        is_deleted: false,
      });
    });

    it('should leave the data identical when the same feed is synchronized again', async () => {
      // Given
      await createOpenCTIPlatformForOrganization(
        uuidv4(),
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
      );
      await createOpenCTIPlatformForOrganization(
        uuidv4(),
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
      );
      mockFeed(buildFeed(1, 2, 3, 4, 5, 6));
      const firstResult = await NewsFeedApp.syncBlogposts();
      const stateAfterFirstCall = await loadBlogpostState();

      // When
      const secondResult = await NewsFeedApp.syncBlogposts();

      // Then
      expect(firstResult).toEqual({
        created: 6,
        updated: 0,
        dropped: 0,
        provisionedPlatforms: 2,
      });
      expect(secondResult).toEqual({
        created: 0,
        updated: 6,
        dropped: 0,
        provisionedPlatforms: 2,
      });
      expect(await loadBlogpostState()).toEqual(stateAfterFirstCall);
    });

    it('should provision every item of the feed to the platforms that support blogposts', async () => {
      // Given
      const supportedPlatformId = uuidv4();
      const newerPlatformId = uuidv4();
      const organizationId = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID;
      await createOpenCTIPlatformForOrganization(
        supportedPlatformId,
        organizationId,
        { platform_version: SUPPORTED_VERSION }
      );
      await createOpenCTIPlatformForOrganization(
        newerPlatformId,
        organizationId,
        { platform_version: ABOVE_VERSION }
      );
      await createOpenCTIPlatformForOrganization(uuidv4(), organizationId, {
        platform_version: BELOW_VERSION,
      });
      await createOpenCTIPlatformForOrganization(uuidv4(), organizationId, {
        platform_version: null,
      });
      await createOpenCTIPlatformForOrganization(uuidv4(), organizationId, {
        platform_version: 'not-a-version',
      });
      mockFeed(buildFeed(1, 2));

      // When
      const result = await NewsFeedApp.syncBlogposts();

      // Then
      expect(result.provisionedPlatforms).toBe(2);
      const provisioned = await TestHelper.newsFeed.loadProvisioned({});
      expect(provisioned).toHaveLength(4);
      expect(
        new Set(provisioned.map(({ platform_id }) => platform_id))
      ).toEqual(new Set([supportedPlatformId, newerPlatformId]));
      const items = await TestHelper.newsFeed.loadItems();
      expect(
        new Set(provisioned.map(({ news_feed_item_id }) => news_feed_item_id))
      ).toEqual(new Set(items.map(({ id }) => id)));
    });

    it('should not provision any platform when the blogpost gate is disabled', async () => {
      // Given
      setRequiredBlogpostVersion(null);
      await createOpenCTIPlatformForOrganization(
        uuidv4(),
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
      );
      mockFeed(buildFeed(1, 2));

      // When
      const result = await NewsFeedApp.syncBlogposts();

      // Then
      expect(result).toEqual({
        created: 2,
        updated: 0,
        dropped: 0,
        provisionedPlatforms: 0,
      });
      expect(await TestHelper.newsFeed.loadProvisioned({})).toHaveLength(0);
    });

    it('should provision a restored item to the platforms that support blogposts', async () => {
      // Given
      const platformId = uuidv4();
      await createOpenCTIPlatformForOrganization(
        platformId,
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
      );
      mockFeed(buildFeed(1, 2));
      await NewsFeedApp.syncBlogposts();
      mockFeed(buildFeed(1));
      await NewsFeedApp.syncBlogposts();
      await TestHelper.newsFeed.deleteProvisioned();
      mockFeed(buildFeed(1, 2));

      // When
      await NewsFeedApp.syncBlogposts();

      // Then
      const restoredItem = await loadBlogpostItem('blog-post-2');
      expect(restoredItem?.is_deleted).toBe(false);
      expect(
        await TestHelper.newsFeed.loadProvisioned({
          news_feed_item_id: restoredItem!.id,
        })
      ).toMatchObject([{ platform_id: platformId }]);
    });

    it('should provision the dropped items so that the platforms delete them', async () => {
      // Given
      const platformId = uuidv4();
      await createOpenCTIPlatformForOrganization(
        platformId,
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
      );
      mockFeed(buildFeed(1, 2));
      await NewsFeedApp.syncBlogposts();
      await TestHelper.newsFeed.deleteProvisioned();
      mockFeed(buildFeed(1));

      // When
      await NewsFeedApp.syncBlogposts();

      // Then
      const droppedItem = await loadBlogpostItem('blog-post-2');
      expect(droppedItem?.is_deleted).toBe(true);
      expect(
        await TestHelper.newsFeed.loadProvisioned({
          news_feed_item_id: droppedItem!.id,
        })
      ).toMatchObject([{ platform_id: platformId }]);
    });

    it('should only provision the actively registered platforms', async () => {
      // Given
      const activePlatformId = uuidv4();
      await createOpenCTIPlatformForOrganization(
        activePlatformId,
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
      );
      await createOpenCTIPlatformForOrganization(
        uuidv4(),
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        { status: PlatformConfigurationStatus.Inactive }
      );
      mockFeed(buildFeed(1));

      // When
      const result = await NewsFeedApp.syncBlogposts();

      // Then
      expect(result.provisionedPlatforms).toBe(1);
      expect(await TestHelper.newsFeed.loadProvisioned({})).toMatchObject([
        { platform_id: activePlatformId },
      ]);
    });

    it('should leave the other products and the other types of items untouched', async () => {
      // Given
      const openAevPlatformId = uuidv4();
      const openAevServiceInstance = await TestHelper.serviceInstance.create({
        service_definition_id: SERVICES.DEFINITIONS.OPENAEV_REGISTRATION.ID,
      });
      createdServiceInstanceIds.push(openAevServiceInstance.id);
      await TestHelper.platformConfiguration.create({
        service_instance_id: openAevServiceInstance.id,
        platform_id: openAevPlatformId,
        platform_version: SUPPORTED_VERSION,
      });
      const dashboardItem = await TestHelper.newsFeed.createItem({
        type: NewsFeedItemType.ResourceCustomDashboard,
        platform_identifier: PlatformIdentifier.Opencti,
        title: 'A dashboard',
      });
      const openAevBlogpostItem = await TestHelper.newsFeed.createItem({
        type: NewsFeedItemType.BlogPost,
        platform_identifier: PlatformIdentifier.Openaev,
        title: 'An OpenAEV blogpost',
      });
      await TestHelper.newsFeed.createMetadata({
        news_feed_item_id: openAevBlogpostItem.id,
        key: NewsFeedItemMetadataKey.BlogPostSlug,
        value: 'openaev-blog-post',
      });
      mockFeed(buildFeed(1));

      // When
      const result = await NewsFeedApp.syncBlogposts();

      // Then
      expect(result).toMatchObject({ created: 1, updated: 0, dropped: 0 });
      expect(
        await TestHelper.newsFeed.loadFirstItem({ id: dashboardItem.id })
      ).toMatchObject({ title: 'A dashboard', is_deleted: false });
      expect(
        await TestHelper.newsFeed.loadFirstItem({ id: openAevBlogpostItem.id })
      ).toMatchObject({ title: 'An OpenAEV blogpost', is_deleted: false });
      expect(
        await TestHelper.newsFeed.loadProvisioned({
          platform_id: openAevPlatformId,
        })
      ).toHaveLength(0);
    });

    it('should refuse an empty feed while blogpost items are active, and change nothing', async () => {
      // Given
      await createOpenCTIPlatformForOrganization(
        uuidv4(),
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
      );
      mockFeed(buildFeed(1, 2));
      await NewsFeedApp.syncBlogposts();
      const stateBefore = await loadBlogpostState();
      mockFeed([]);

      // When
      const sync = NewsFeedApp.syncBlogposts();

      // Then
      await expect(sync).rejects.toThrow(ErrorCode.NewsFeedBlogpostEmptyFeed);
      expect(await loadBlogpostState()).toEqual(stateBefore);
    });

    it('should accept an empty feed when the Hub holds no active blogpost item', async () => {
      // Given
      const droppedItem = await TestHelper.newsFeed.createItem({
        type: NewsFeedItemType.BlogPost,
        title: 'A dropped blogpost',
        is_deleted: true,
      });
      await TestHelper.newsFeed.createMetadata({
        news_feed_item_id: droppedItem.id,
        key: NewsFeedItemMetadataKey.BlogPostSlug,
        value: 'a-dropped-blog-post',
      });
      mockFeed([]);

      // When
      const result = await NewsFeedApp.syncBlogposts();

      // Then
      expect(result).toEqual({
        created: 0,
        updated: 0,
        dropped: 0,
        provisionedPlatforms: 0,
      });
      expect(
        await TestHelper.newsFeed.loadFirstItem({ id: droppedItem.id })
      ).toMatchObject({ is_deleted: true });
    });

    it('should change nothing when the blog API fails', async () => {
      // Given
      mockFeed(buildFeed(1, 2));
      await NewsFeedApp.syncBlogposts();
      const stateBefore = await loadBlogpostState();
      fetchBlogFeedSpy.mockRejectedValue(
        new BlogApiError(BlogApiErrorCode.Unreachable, 'Blog API unreachable')
      );

      // When
      const sync = NewsFeedApp.syncBlogposts();

      // Then
      await expect(sync).rejects.toThrow('Blog API unreachable');
      expect(await loadBlogpostState()).toEqual(stateBefore);
    });

    it('should roll back everything when the feed holds two posts with the same slug', async () => {
      // Given
      await createOpenCTIPlatformForOrganization(
        uuidv4(),
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
      );
      mockFeed(buildFeed(1, 2));
      await NewsFeedApp.syncBlogposts();
      const stateBefore = await loadBlogpostState();
      mockFeed([
        buildPost(1, { title: 'A new title' }),
        buildPost(3),
        buildPost(3, { id: 'post-3-duplicate', title: 'Duplicate of post 3' }),
      ]);

      // When
      const sync = NewsFeedApp.syncBlogposts();

      // Then
      await expect(sync).rejects.toThrow();
      expect(await loadBlogpostItem('blog-post-3')).toBeUndefined();
      expect(await loadBlogpostState()).toEqual(stateBefore);
    });

    it('should roll back the reconciliation when the provisioning fails', async () => {
      // Given
      await createOpenCTIPlatformForOrganization(
        uuidv4(),
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
      );
      mockFeed(buildFeed(1, 2));
      await NewsFeedApp.syncBlogposts();
      await TestHelper.newsFeed.deleteProvisioned();
      const stateBefore = await loadBlogpostState();
      // The post 0 is created, the post 1 rewritten and the post 2 dropped
      mockFeed([buildPost(0), buildPost(1, { title: 'A new title' })]);
      const droppedItemId = (await loadBlogpostItem('blog-post-2'))!.id;
      // The real provisioning writes the created and the updated items, the dropped one is the failure
      const provisionNewsFeedItem = NewsFeedDomain.provisionNewsFeedItem;
      provisionSpy = vi
        .spyOn(NewsFeedDomain, 'provisionNewsFeedItem')
        .mockImplementation(async (newsFeedItemId, platformIds) => {
          if (newsFeedItemId === droppedItemId) {
            throw new Error('provisioning failed');
          }
          await provisionNewsFeedItem(newsFeedItemId, platformIds);
        });

      // When
      const sync = NewsFeedApp.syncBlogposts();

      // Then
      await expect(sync).rejects.toThrow('provisioning failed');
      expect(await loadBlogpostItem('blog-post-0')).toBeUndefined();
      expect(await loadBlogpostState()).toEqual(stateBefore);
    });
  });

  describe('blogpost backfill', () => {
    const BLOGPOST_REQUIRED_VERSION = '7.260901.0';
    // Default of news_feed.blogpost_limit
    const DEFAULT_BLOGPOST_LIMIT = 6;
    const BELOW_VERSION = '7.260831.0';
    const ABOVE_VERSION = '7.260902.0';
    const BACKFILL_ERROR_MESSAGE =
      'Unable to backfill blogpost news feed items';
    const originalBlogpostSupport =
      RequiredPlatformVersions.NewsFeedBlogpostSupport;

    const enableBlogpostGate = () => {
      RequiredPlatformVersions.NewsFeedBlogpostSupport = {
        [PlatformIdentifier.Opencti]: BLOGPOST_REQUIRED_VERSION,
        [PlatformIdentifier.Openaev]: BLOGPOST_REQUIRED_VERSION,
        [PlatformIdentifier.Xtmone]: null,
      };
    };

    // The blogpost number 1 is the newest one
    const createBlogposts = async (count: number) => {
      const blogposts = [];
      for (let number = 1; number <= count; number++) {
        blogposts.push(
          await TestHelper.newsFeed.createItem({
            title: `Blogpost ${number}`,
            type: NewsFeedItemType.BlogPost,
            platform_identifier: PlatformIdentifier.Opencti,
            creation_date: new Date(Date.now() - number * 24 * 60 * 60 * 1000),
          })
        );
      }
      return blogposts;
    };

    const loadProvisionedItemIds = async (platformId: string) =>
      (await TestHelper.newsFeed.loadProvisioned({ platform_id: platformId }))
        .map((row) => row.news_feed_item_id)
        .sort();

    afterEach(async () => {
      RequiredPlatformVersions.NewsFeedBlogpostSupport =
        originalBlogpostSupport;
      await TestHelper.newsFeed.deleteItem();
      await cleanupCreatedServiceInstances();
    });

    describe('backfillBlogpostsForPlatform', () => {
      it('should provision the newest blogposts up to the configured limit when the version supports blogposts', async () => {
        // Given
        enableBlogpostGate();
        const blogposts = await createBlogposts(8);
        const platformId = uuidv4();

        // When
        await NewsFeedApp.backfillBlogpostsForPlatform({
          platformId,
          platformIdentifier: PlatformIdentifier.Opencti,
          platformVersion: BLOGPOST_REQUIRED_VERSION,
        });

        // Then
        expect(await loadProvisionedItemIds(platformId)).toEqual(
          blogposts
            .slice(0, DEFAULT_BLOGPOST_LIMIT)
            .map(({ id }) => id)
            .sort()
        );
      });

      it.each`
        description  | version
        ${'below'}   | ${BELOW_VERSION}
        ${'invalid'} | ${'not-a-version'}
        ${'missing'} | ${null}
      `(
        'should not provision anything when the platform version is $description the required version',
        async ({ version }) => {
          // Given
          enableBlogpostGate();
          await createBlogposts(2);
          const platformId = uuidv4();

          // When
          await NewsFeedApp.backfillBlogpostsForPlatform({
            platformId,
            platformIdentifier: PlatformIdentifier.Opencti,
            platformVersion: version,
          });

          // Then
          expect(await loadProvisionedItemIds(platformId)).toEqual([]);
        }
      );

      it('should not provision anything while the gate is disabled', async () => {
        // Given
        await createBlogposts(2);
        const platformId = uuidv4();

        // When
        await NewsFeedApp.backfillBlogpostsForPlatform({
          platformId,
          platformIdentifier: PlatformIdentifier.Opencti,
          platformVersion: '99.0.0',
        });

        // Then
        expect(await loadProvisionedItemIds(platformId)).toEqual([]);
      });

      it('should not provision anything to a platform of a product without blogposts', async () => {
        // Given
        enableBlogpostGate();
        await createBlogposts(2);
        const platformId = uuidv4();

        // When
        await NewsFeedApp.backfillBlogpostsForPlatform({
          platformId,
          platformIdentifier: PlatformIdentifier.Openaev,
          platformVersion: ABOVE_VERSION,
        });

        // Then
        expect(await loadProvisionedItemIds(platformId)).toEqual([]);
      });

      it('should be idempotent when the platform is backfilled twice', async () => {
        // Given
        enableBlogpostGate();
        const blogposts = await createBlogposts(3);
        const platformId = uuidv4();
        const input = {
          platformId,
          platformIdentifier: PlatformIdentifier.Opencti,
          platformVersion: ABOVE_VERSION,
        };
        await NewsFeedApp.backfillBlogpostsForPlatform(input);

        // When
        await NewsFeedApp.backfillBlogpostsForPlatform(input);

        // Then
        expect(await loadProvisionedItemIds(platformId)).toEqual(
          blogposts.map(({ id }) => id).sort()
        );
      });

      it('should log the error and not throw when the provisioning fails', async () => {
        // Given
        enableBlogpostGate();
        const platformId = uuidv4();
        const failure = new Error('database unavailable');
        const provisionSpy = vi
          .spyOn(NewsFeedDomain, 'provisionLatestBlogpostsToPlatform')
          .mockRejectedValue(failure);
        const logErrorSpy = vi.spyOn(logApp, 'error').mockImplementation(() => {
          return logApp;
        });

        // When
        const call = NewsFeedApp.backfillBlogpostsForPlatform({
          platformId,
          platformIdentifier: PlatformIdentifier.Opencti,
          platformVersion: ABOVE_VERSION,
        });

        // Then
        await expect(call).resolves.toBeUndefined();
        expect(logErrorSpy).toHaveBeenCalledWith(BACKFILL_ERROR_MESSAGE, {
          error: failure,
          platformId,
          platformIdentifier: PlatformIdentifier.Opencti,
        });
        provisionSpy.mockRestore();
        logErrorSpy.mockRestore();
      });
    });

    describe('backfillBlogpostsOnVersionChange', () => {
      it.each`
        description                     | previousVersion              | newVersion                   | expectedBackfill
        ${'below to above'}             | ${BELOW_VERSION}             | ${ABOVE_VERSION}             | ${true}
        ${'below to equal'}             | ${BELOW_VERSION}             | ${BLOGPOST_REQUIRED_VERSION} | ${true}
        ${'missing to above'}           | ${null}                      | ${ABOVE_VERSION}             | ${true}
        ${'invalid to above'}           | ${'not-a-version'}           | ${ABOVE_VERSION}             | ${true}
        ${'below to below'}             | ${'7.260801.0'}              | ${BELOW_VERSION}             | ${false}
        ${'above to above'}             | ${BLOGPOST_REQUIRED_VERSION} | ${ABOVE_VERSION}             | ${false}
        ${'above to below (downgrade)'} | ${ABOVE_VERSION}             | ${BELOW_VERSION}             | ${false}
      `(
        'should backfill: $expectedBackfill when the version goes $description',
        async ({ previousVersion, newVersion, expectedBackfill }) => {
          // Given
          enableBlogpostGate();
          const blogposts = await createBlogposts(2);
          const platformId = uuidv4();
          const serviceInstance = await createOpenCTIPlatformForOrganization(
            platformId,
            TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
            { platform_version: newVersion }
          );

          // When
          await NewsFeedApp.backfillBlogpostsOnVersionChange({
            serviceInstanceId: serviceInstance.id,
            platformId,
            previousVersion,
            newVersion,
          });

          // Then
          expect(await loadProvisionedItemIds(platformId)).toEqual(
            expectedBackfill ? blogposts.map(({ id }) => id).sort() : []
          );
        }
      );

      it('should use the platform identifier given by the caller instead of resolving it', async () => {
        // Given
        enableBlogpostGate();
        const blogposts = await createBlogposts(1);
        const platformId = uuidv4();

        // When
        await NewsFeedApp.backfillBlogpostsOnVersionChange({
          serviceInstanceId: uuidv4() as ServiceInstanceId,
          platformId,
          platformIdentifier: PlatformIdentifier.Opencti,
          previousVersion: BELOW_VERSION,
          newVersion: ABOVE_VERSION,
        });

        // Then
        expect(await loadProvisionedItemIds(platformId)).toEqual(
          blogposts.map(({ id }) => id)
        );
      });

      it('should not provision anything nor throw when the platform identifier cannot be resolved', async () => {
        // Given
        enableBlogpostGate();
        await createBlogposts(1);
        const platformId = uuidv4();

        // When
        const call = NewsFeedApp.backfillBlogpostsOnVersionChange({
          serviceInstanceId: uuidv4() as ServiceInstanceId,
          platformId,
          previousVersion: BELOW_VERSION,
          newVersion: ABOVE_VERSION,
        });

        // Then
        await expect(call).resolves.toBeUndefined();
        expect(await loadProvisionedItemIds(platformId)).toEqual([]);
      });
    });
  });
});
