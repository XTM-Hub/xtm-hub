import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import { TEST_ORGANIZATIONS } from '../../../tests/tests.const';
import {
  DeploymentRequestConnection,
  DeploymentRequestDeploymentType,
  DeploymentRequestFilterKey,
  DeploymentRequestHubStatus,
  DeploymentRequestOrdering,
  DeploymentRequestPlatformRegion,
  DeploymentRequestPlatformState,
  OrderingMode,
  PlatformIdentifier,
} from '../../__generated__/resolvers-types';
import { DeploymentRequestId } from '../../model/kanel/public/DeploymentRequest';
import { UserId } from '../../model/kanel/public/User';
import { auth0Client } from '../../thirdparty/auth0/client';
import {
  DeploymentRequestDomain,
  shouldDeleteDeploymentRequestAudience,
} from './deployment.domain';
import { ServiceGroupDomain } from './group/service-group.domain';
import { QuotaKey, trialQuotaKey } from './quota/deployment.quota.domain';

describe('deploymentRequestDomain', () => {
  beforeEach(async () => {
    await TestHelper.deploymentRequest.delete({});
  });

  describe('loadDeploymentRequest', () => {
    afterEach(async () => {
      await TestHelper.deploymentRequest.deleteAllWithServiceInstanceAndSubscription();
    });

    it('should return filtered deployment requests', async () => {
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {}
      );
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          hub_status: DeploymentRequestHubStatus.Active,
        }
      );

      const deploymentRequests =
        await DeploymentRequestDomain.loadDeploymentRequests<DeploymentRequestConnection>(
          {
            first: 10,
            orderBy: DeploymentRequestOrdering.Ordering,
            orderMode: OrderingMode.Asc,
            filters: [
              {
                key: DeploymentRequestFilterKey.HubStatus,
                value: [DeploymentRequestHubStatus.Active],
              },
            ],
          }
        );

      expect(deploymentRequests.totalCount).toBe('1');
      expect(deploymentRequests.edges[0]?.node?.hub_status).toBe(
        DeploymentRequestHubStatus.Active
      );
    });
    it('should expose parent_id and url on returned deployment requests', async () => {
      const bundle =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            type: DeploymentRequestDeploymentType.Bundle,
            platform_identifier: null,
          }
        );
      const child =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            parent_id: bundle.id,
            url: 'https://xtmone.example.com',
          }
        );

      const deploymentRequests =
        await DeploymentRequestDomain.loadDeploymentRequests<DeploymentRequestConnection>(
          {
            first: 10,
            orderBy: DeploymentRequestOrdering.Ordering,
            orderMode: OrderingMode.Asc,
          }
        );

      const childNode = deploymentRequests.edges.find(
        (edge) => edge?.node?.id === child.id
      )?.node;
      expect(childNode?.parent_id).toBe(bundle?.id);
      expect(childNode?.url).toBe('https://xtmone.example.com');
    });
    it('should exclude bundle children when filtering on a null parent_id', async () => {
      const bundle =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            type: DeploymentRequestDeploymentType.Bundle,
            platform_identifier: null,
          }
        );
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          parent_id: bundle.id,
        }
      );
      const standalone =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {}
        );

      const deploymentRequests =
        await DeploymentRequestDomain.loadDeploymentRequests<DeploymentRequestConnection>(
          {
            first: 10,
            orderBy: DeploymentRequestOrdering.Ordering,
            orderMode: OrderingMode.Asc,
            filters: [
              {
                key: DeploymentRequestFilterKey.Type,
                value: [DeploymentRequestDeploymentType.Trial],
              },
              {
                key: DeploymentRequestFilterKey.ParentId,
                value: ['null'],
              },
            ],
          }
        );

      expect(deploymentRequests.totalCount).toBe('1');
      expect(deploymentRequests.edges[0]?.node?.id).toBe(standalone.id);
    });
    it('should filter deployment requests when searchTerm is specified ', async () => {
      const deployment =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {}
        );
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          user_requester_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE
            .ID as UserId,
        }
      );

      const deploymentRequests =
        await DeploymentRequestDomain.loadDeploymentRequests<DeploymentRequestConnection>(
          {
            first: 10,
            orderBy: DeploymentRequestOrdering.Ordering,
            orderMode: OrderingMode.Asc,
            searchTerm: 'admin',
          }
        );
      expect(deploymentRequests.totalCount).toBe('1');
      expect(deploymentRequests.edges[0]?.node?.id).toBe(deployment?.id);
    });
    it('should not return deployment request with wrong hub_status even if searchTerm matches', async () => {
      const activeDeployment =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            hub_status: DeploymentRequestHubStatus.Active,
          }
        );

      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          hub_status: DeploymentRequestHubStatus.Expired,
        }
      );

      const result =
        await DeploymentRequestDomain.loadDeploymentRequests<DeploymentRequestConnection>(
          {
            first: 10,
            orderBy: DeploymentRequestOrdering.Ordering,
            orderMode: OrderingMode.Asc,
            searchTerm: 'admin',
            filters: [
              {
                key: DeploymentRequestFilterKey.HubStatus,
                value: [DeploymentRequestHubStatus.Active],
              },
            ],
          }
        );

      expect(result.totalCount).toBe('1');
      expect(result.edges[0]?.node?.id).toBe(activeDeployment.id);
    });
    it('should not return deployment request with wrong platform_identifier even if searchTerm matches', async () => {
      const openctiDeployment =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            platform_identifier: PlatformIdentifier.Opencti,
          }
        );

      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          platform_identifier: PlatformIdentifier.Openaev,
        }
      );

      const result =
        await DeploymentRequestDomain.loadDeploymentRequests<DeploymentRequestConnection>(
          {
            first: 10,
            orderBy: DeploymentRequestOrdering.Ordering,
            orderMode: OrderingMode.Asc,
            searchTerm: 'admin',
            filters: [
              {
                key: DeploymentRequestFilterKey.PlatformIdentifier,
                value: [PlatformIdentifier.Opencti],
              },
            ],
          }
        );

      expect(result.totalCount).toBe('1');
      expect(result.edges[0]?.node?.id).toBe(openctiDeployment.id);
    });
    it('should return ordered deployment requests', async () => {
      const deployment1 =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          { ordering: 1 }
        );
      const deployment2 =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          { ordering: 2 }
        );

      const deploymentRequests =
        await DeploymentRequestDomain.loadDeploymentRequests<DeploymentRequestConnection>(
          {
            first: 10,
            orderBy: DeploymentRequestOrdering.Ordering,
            orderMode: OrderingMode.Asc,
          }
        );

      expect(deploymentRequests.totalCount).toBe('2');
      expect(deploymentRequests.edges[0]?.node?.id).toBe(deployment1?.id);
      expect(deploymentRequests.edges[1]?.node?.id).toBe(deployment2?.id);
    });
  });

  describe('loadDeploymentRequestsBy', () => {
    afterEach(async () => {
      await TestHelper.deploymentRequest.deleteAllWithServiceInstanceAndSubscription();
    });

    it('should return all deployment requests matching the given conditions', async () => {
      const bundle =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            type: DeploymentRequestDeploymentType.Bundle,
            platform_identifier: null,
          }
        );
      const child1 =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          { parent_id: bundle.id }
        );
      const child2 =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          { parent_id: bundle.id }
        );
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        { parent_id: null }
      );

      const children = await DeploymentRequestDomain.loadDeploymentRequestsBy({
        parent_id: bundle.id,
      });

      expect(children).toHaveLength(2);
      expect(children.map((child) => child.id).sort()).toEqual(
        [child1?.id, child2?.id].sort()
      );
    });

    it('should return an empty array when no deployment request matches', async () => {
      const children = await DeploymentRequestDomain.loadDeploymentRequestsBy({
        parent_id: uuidv4() as DeploymentRequestId,
      });

      expect(children).toEqual([]);
    });
  });

  describe('loadChildrenByParentIds', () => {
    afterEach(async () => {
      await TestHelper.deploymentRequest.deleteAllWithServiceInstanceAndSubscription();
    });

    const createBundle = () =>
      TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription({
        type: DeploymentRequestDeploymentType.Bundle,
        platform_identifier: null,
      });

    it('should return the children of the requested bundles only', async () => {
      // Given
      const firstBundle = await createBundle();
      const secondBundle = await createBundle();
      const unrequestedBundle = await createBundle();
      const firstChild =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            parent_id: firstBundle.id,
            platform_identifier: PlatformIdentifier.Opencti,
          }
        );
      const secondChild =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            parent_id: secondBundle.id,
            platform_identifier: PlatformIdentifier.Openaev,
          }
        );
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          parent_id: unrequestedBundle.id,
          platform_identifier: PlatformIdentifier.Xtmone,
        }
      );

      // When
      const children = await DeploymentRequestDomain.loadChildrenByParentIds([
        firstBundle.id,
        secondBundle.id,
      ]);

      // Then
      expect(children).toHaveLength(2);
      expect(
        children.find((request) => request.id === firstChild.id)
      ).toMatchObject({
        parent_id: firstBundle.id,
        platform_identifier: PlatformIdentifier.Opencti,
      });
      expect(
        children.find((request) => request.id === secondChild.id)
      ).toMatchObject({
        parent_id: secondBundle.id,
        platform_identifier: PlatformIdentifier.Openaev,
      });
    });

    it('should expose the platform url of the children', async () => {
      // Given
      const bundle = await createBundle();
      const child =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            parent_id: bundle.id,
            platform_identifier: PlatformIdentifier.Opencti,
          }
        );
      await TestHelper.platformConfiguration.create({
        service_instance_id: child.service_instance_id,
        platform_url: 'https://opencti.example.com',
      });

      // When
      const children = await DeploymentRequestDomain.loadChildrenByParentIds([
        bundle.id,
      ]);

      // Then
      expect(children[0]).toMatchObject({
        id: child.id,
        platform_url: 'https://opencti.example.com',
      });

      await TestHelper.platformConfiguration.delete({
        service_instance_id: child.service_instance_id,
      });
    });
  });

  describe('loadDeploymentRequestWithChildren', () => {
    afterEach(async () => {
      await TestHelper.deploymentRequest.deleteAllWithServiceInstanceAndSubscription();
    });

    it('should return the bundle first, then its children ordered by platform identifier', async () => {
      const bundle =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            type: DeploymentRequestDeploymentType.Bundle,
            platform_identifier: null,
          }
        );
      const childXtmone =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            parent_id: bundle.id,
            platform_identifier: PlatformIdentifier.Xtmone,
          }
        );
      const childOpencti =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            parent_id: bundle.id,
            platform_identifier: PlatformIdentifier.Opencti,
          }
        );
      const childOpenaev =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            parent_id: bundle.id,
            platform_identifier: PlatformIdentifier.Openaev,
          }
        );

      const family =
        await DeploymentRequestDomain.loadDeploymentRequestWithChildren(bundle);

      expect(family.map(({ id }) => id)).toEqual([
        bundle.id,
        childOpenaev.id,
        childOpencti.id,
        childXtmone.id,
      ]);
    });

    it('should return the standalone trial alone', async () => {
      const standalone =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {}
        );
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        { platform_identifier: PlatformIdentifier.Openaev }
      );

      const family =
        await DeploymentRequestDomain.loadDeploymentRequestWithChildren(
          standalone
        );

      expect(family).toEqual([standalone]);
    });

    it('should only return children matching the given hub status', async () => {
      const bundle =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            type: DeploymentRequestDeploymentType.Bundle,
            platform_identifier: null,
            hub_status: DeploymentRequestHubStatus.Active,
          }
        );
      const activeChild =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            parent_id: bundle.id,
            platform_identifier: PlatformIdentifier.Opencti,
            hub_status: DeploymentRequestHubStatus.Active,
          }
        );
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          parent_id: bundle.id,
          platform_identifier: PlatformIdentifier.Xtmone,
          hub_status: DeploymentRequestHubStatus.Cancelled,
        }
      );

      const family =
        await DeploymentRequestDomain.loadDeploymentRequestWithChildren(
          bundle,
          DeploymentRequestHubStatus.Active
        );

      expect(family.map(({ id }) => id)).toEqual([bundle.id, activeChild.id]);
    });
  });

  describe('loadTrialsToExpire', () => {
    afterEach(async () => {
      await TestHelper.deploymentRequest.deleteAllWithServiceInstanceAndSubscription();
    });

    it('should return expired bundles and standalone trials, but not bundle children', async () => {
      const expiredDate = new Date(Date.UTC(2020, 0, 1));
      const futureDate = new Date(Date.UTC(2999, 0, 1));

      const expiredBundle =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            type: DeploymentRequestDeploymentType.Bundle,
            platform_identifier: null,
            hub_status: DeploymentRequestHubStatus.Active,
            end_date: expiredDate,
          }
        );
      const expiredChild =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            parent_id: expiredBundle.id,
            hub_status: DeploymentRequestHubStatus.Active,
            end_date: expiredDate,
          }
        );
      const expiredStandalone =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            hub_status: DeploymentRequestHubStatus.Active,
            end_date: expiredDate,
          }
        );
      const ongoingBundle =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            type: DeploymentRequestDeploymentType.Bundle,
            platform_identifier: null,
            hub_status: DeploymentRequestHubStatus.Active,
            end_date: futureDate,
          }
        );

      const toExpire = await DeploymentRequestDomain.loadTrialsToExpire();

      expect(toExpire.map(({ id }) => id).sort()).toEqual(
        [expiredBundle.id, expiredStandalone.id].sort()
      );
      expect(toExpire.map(({ id }) => id)).not.toContain(expiredChild.id);
      expect(toExpire.map(({ id }) => id)).not.toContain(ongoingBundle.id);
    });
  });

  describe('loadLatestDeploymentRequestForUser', () => {
    afterEach(async () => {
      await TestHelper.deploymentRequest.deleteAllWithServiceInstanceAndSubscription();
    });

    it('should return deployment request when Active trial deployment exists for user', async () => {
      const platformIdentifier = PlatformIdentifier.Opencti;
      const userId = TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID as UserId;

      const deployment =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            platform_identifier: platformIdentifier,
            hub_status: DeploymentRequestHubStatus.Active,
            type: DeploymentRequestDeploymentType.Trial,
            organization_requester_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
          }
        );

      const result =
        await DeploymentRequestDomain.loadLatestDeploymentRequestForUser(
          userId,
          {
            type: DeploymentRequestDeploymentType.Trial,
            platform_identifier: platformIdentifier,
          }
        );

      expect(result).toBeDefined();
      expect(result?.id).toBe(deployment!.id);
      expect(result?.platform_identifier).toBe(platformIdentifier);
      expect(result?.hub_status).toBe(DeploymentRequestHubStatus.Active);
    });

    it('should return deployment request when Expired trial deployment exists for user', async () => {
      const platformIdentifier = PlatformIdentifier.Opencti;
      const userId = TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID as UserId;

      const deployment =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            platform_identifier: platformIdentifier,
            hub_status: DeploymentRequestHubStatus.Expired,
            type: DeploymentRequestDeploymentType.Trial,
            organization_requester_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
          }
        );

      const result =
        await DeploymentRequestDomain.loadLatestDeploymentRequestForUser(
          userId,
          {
            type: DeploymentRequestDeploymentType.Trial,
            platform_identifier: platformIdentifier,
          }
        );

      expect(result).toBeDefined();
      expect(result?.id).toBe(deployment!.id);
      expect(result?.hub_status).toBe(DeploymentRequestHubStatus.Expired);
    });

    it('should return deployment request when hub_status is Pending', async () => {
      const platformIdentifier = PlatformIdentifier.Opencti;
      const userId = TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID as UserId;

      const deployment =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            platform_identifier: platformIdentifier,
            hub_status: DeploymentRequestHubStatus.Pending,
            type: DeploymentRequestDeploymentType.Trial,
            organization_requester_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
          }
        );

      const result =
        await DeploymentRequestDomain.loadLatestDeploymentRequestForUser(
          userId,
          {
            type: DeploymentRequestDeploymentType.Trial,
            platform_identifier: platformIdentifier,
          }
        );

      expect(result).toBeDefined();
      expect(result?.id).toBe(deployment!.id);
      expect(result?.hub_status).toBe(DeploymentRequestHubStatus.Pending);
    });

    it('should not return deployment request when user is not member of the organization', async () => {
      const platformIdentifier = PlatformIdentifier.Opencti;
      // ORGANIZATIONS_TEST.SECOND_ORGANIZATION.USERS.SIMPLE.ID is in SECOND ORGA, not in Filigran org (ORGANIZATIONS_TEST.FILIGRAN.ID)
      const userNotInOrganization =
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID;

      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          platform_identifier: platformIdentifier,
          hub_status: DeploymentRequestHubStatus.Active,
          type: DeploymentRequestDeploymentType.Trial,
          organization_requester_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        }
      );

      const result =
        await DeploymentRequestDomain.loadLatestDeploymentRequestForUser(
          userNotInOrganization,
          {
            type: DeploymentRequestDeploymentType.Trial,
            platform_identifier: platformIdentifier,
          }
        );

      expect(result).toBeUndefined();
    });

    it('should not return deployment request when platform_identifier does not match', async () => {
      const platformIdentifier = PlatformIdentifier.Opencti;
      const userId = TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID as UserId;

      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          platform_identifier: PlatformIdentifier.Openaev,
          hub_status: DeploymentRequestHubStatus.Active,
          type: DeploymentRequestDeploymentType.Trial,
          organization_requester_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        }
      );

      const result =
        await DeploymentRequestDomain.loadLatestDeploymentRequestForUser(
          userId,
          {
            type: DeploymentRequestDeploymentType.Trial,
            platform_identifier: platformIdentifier,
          }
        );

      expect(result).toBeUndefined();
    });

    it('should return the bundle deployment request for the user when filtering by type Bundle only', async () => {
      const userId = TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID as UserId;

      const { bundle } = await TestHelper.deploymentRequest.createBundle();

      const result =
        await DeploymentRequestDomain.loadLatestDeploymentRequestForUser(
          userId,
          { type: DeploymentRequestDeploymentType.Bundle }
        );

      expect(result).toBeDefined();
      expect(result?.id).toBe(bundle.id);

      await TestHelper.deploymentRequest.deleteBundle(bundle.id);
    });
  });

  describe('loadTrialDeploymentRequestByPlatformToken', () => {
    afterEach(async () => {
      await TestHelper.deploymentRequest.deleteAllWithServiceInstanceAndSubscription();
    });

    it('should return deployment request when Active trial deployment exists with matching token', async () => {
      const platformToken = uuidv4();

      const deployment =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            platform_token: platformToken,
            hub_status: DeploymentRequestHubStatus.Active,
            type: DeploymentRequestDeploymentType.Trial,
          }
        );

      const result =
        await DeploymentRequestDomain.loadTrialDeploymentRequestByPlatformToken(
          platformToken
        );

      expect(result).toBeDefined();
      expect(result?.id).toBe(deployment!.id);
      expect(result?.platform_token).toBe(platformToken);
      expect(result?.hub_status).toBe(DeploymentRequestHubStatus.Active);
    });

    it('should return deployment request when Expired trial deployment exists with matching token', async () => {
      const platformToken = uuidv4();

      const deployment =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            platform_token: platformToken,
            hub_status: DeploymentRequestHubStatus.Expired,
            type: DeploymentRequestDeploymentType.Trial,
          }
        );

      const result =
        await DeploymentRequestDomain.loadTrialDeploymentRequestByPlatformToken(
          platformToken
        );

      expect(result).toBeDefined();
      expect(result?.id).toBe(deployment!.id);
      expect(result?.hub_status).toBe(DeploymentRequestHubStatus.Expired);
    });

    it('should return deployment request when hub_status is Pending', async () => {
      const platformToken = uuidv4();

      const deployment =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            platform_token: platformToken,
            hub_status: DeploymentRequestHubStatus.Pending,
            type: DeploymentRequestDeploymentType.Trial,
          }
        );

      const result =
        await DeploymentRequestDomain.loadTrialDeploymentRequestByPlatformToken(
          platformToken
        );

      expect(result).toBeDefined();
      expect(result?.id).toBe(deployment!.id);
      expect(result?.hub_status).toBe(DeploymentRequestHubStatus.Pending);
    });

    it('should return undefined when platform_token does not exist', async () => {
      const platformToken = uuidv4();
      const nonExistentToken = 'non-existent-token';

      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          platform_token: platformToken,
          hub_status: DeploymentRequestHubStatus.Active,
          type: DeploymentRequestDeploymentType.Trial,
        }
      );

      const result =
        await DeploymentRequestDomain.loadTrialDeploymentRequestByPlatformToken(
          nonExistentToken
        );

      expect(result).toBeUndefined();
    });
  });

  describe('loadFullDeploymentRequest', () => {
    it('should return a full deployment request when platform id is defined in deployment request', async () => {
      const platformId = uuidv4();
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          hub_status: DeploymentRequestHubStatus.Active,
          type: DeploymentRequestDeploymentType.Trial,
          platform_id: platformId,
        }
      );

      const result = await DeploymentRequestDomain.loadFullDeploymentRequest({
        platform_id: platformId,
      });

      expect(result).toBeDefined();
      expect(result!.organization_name).toBe(TEST_ORGANIZATIONS.FILIGRAN.NAME);
      expect(result!.organization_domains).toHaveLength(2);
      expect(result!.organization_domains).toContain(
        TEST_ORGANIZATIONS.FILIGRAN.DOMAINS.FIRST
      );
      expect(result!.organization_domains).toContain(
        TEST_ORGANIZATIONS.FILIGRAN.DOMAINS.SECOND
      );
      expect(result!.requester_email).toBe(
        TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL
      );
      expect(result!.requester_first_name).toBe(
        TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.FIRST_NAME
      );
      expect(result!.requester_last_name).toBe(
        TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.LAST_NAME
      );
    });

    it('should return undefined when platform id is an unknown deployment request platform id', async () => {
      const result = await DeploymentRequestDomain.loadFullDeploymentRequest({
        platform_id: uuidv4(),
      });

      expect(result).toBeUndefined();
    });

    it('should return the most recent deployment request by request_date when orderBy is provided and multiple rows match', async () => {
      const region = DeploymentRequestPlatformRegion.UsEast;
      const older =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            hub_status: DeploymentRequestHubStatus.Cancelled,
            type: DeploymentRequestDeploymentType.Bundle,
            platform_identifier: null,
            region,
            request_date: new Date(Date.UTC(2025, 0, 1)),
          }
        );
      const newer =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            hub_status: DeploymentRequestHubStatus.Active,
            type: DeploymentRequestDeploymentType.Bundle,
            platform_identifier: null,
            region,
            request_date: new Date(Date.UTC(2025, 5, 1)),
          }
        );

      const result = await DeploymentRequestDomain.loadFullDeploymentRequest(
        {
          type: DeploymentRequestDeploymentType.Bundle,
          organization_requester_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        },
        { orderBy: { column: 'request_date', order: OrderingMode.Desc } }
      );

      expect(result).toBeDefined();
      expect(result!.id).toBe(newer.id);
      expect(result!.id).not.toBe(older.id);
      expect(result!.hub_status).toBe(DeploymentRequestHubStatus.Active);
    });
  });

  describe('reorderDeploymentRequestUp', () => {
    const BUNDLE_QUEUE_REGION = DeploymentRequestPlatformRegion.UsEast;

    const createQueuedBundle = (ordering: number) =>
      TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription({
        type: DeploymentRequestDeploymentType.Bundle,
        platform_identifier: null,
        region: BUNDLE_QUEUE_REGION,
        ordering,
        hub_status: DeploymentRequestHubStatus.Queued,
      });
    it('should do nothing when deployment request is the top one', async () => {
      const topDeploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 1,
          }
        );
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          ordering: 2,
        }
      );

      await DeploymentRequestDomain.reorderDeploymentRequestUp(
        topDeploymentRequest!
      );
      const resultDeploymentRequest =
        await DeploymentRequestDomain.loadDeploymentRequestBy({
          id: topDeploymentRequest!.id,
        });

      expect(resultDeploymentRequest).toBeDefined();
      expect(resultDeploymentRequest!.ordering).toBe(1);
    });

    it('should swap deployment request with the previous one', async () => {
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          ordering: 2,
          hub_status: DeploymentRequestHubStatus.Queued,
        }
      );
      const previousDeploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 3,
            hub_status: DeploymentRequestHubStatus.Queued,
          }
        );
      const selectedDeploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 4,
            hub_status: DeploymentRequestHubStatus.Queued,
          }
        );

      await DeploymentRequestDomain.reorderDeploymentRequestUp(
        selectedDeploymentRequest!
      );
      const resultPreviousDeploymentRequest =
        await DeploymentRequestDomain.loadDeploymentRequestBy({
          id: previousDeploymentRequest!.id,
        });
      const resultSelectedDeploymentRequest =
        await DeploymentRequestDomain.loadDeploymentRequestBy({
          id: selectedDeploymentRequest!.id,
        });
      expect(resultPreviousDeploymentRequest).toBeDefined();
      expect(resultPreviousDeploymentRequest!.ordering).toBe(4);

      expect(resultSelectedDeploymentRequest).toBeDefined();
      expect(resultSelectedDeploymentRequest!.ordering).toBe(3);
    });

    it('should only reorder queued deployment requests', async () => {
      const previousDeploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 3,
            hub_status: DeploymentRequestHubStatus.Active,
          }
        );
      const selectedDeploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 4,
            hub_status: DeploymentRequestHubStatus.Queued,
          }
        );

      await DeploymentRequestDomain.reorderDeploymentRequestUp(
        selectedDeploymentRequest!
      );
      const resultPreviousDeploymentRequest =
        await DeploymentRequestDomain.loadDeploymentRequestBy({
          id: previousDeploymentRequest!.id,
        });
      const resultSelectedDeploymentRequest =
        await DeploymentRequestDomain.loadDeploymentRequestBy({
          id: selectedDeploymentRequest!.id,
        });

      expect(resultPreviousDeploymentRequest).toBeDefined();
      expect(resultPreviousDeploymentRequest!.ordering).toBe(3);

      expect(resultSelectedDeploymentRequest).toBeDefined();
      expect(resultSelectedDeploymentRequest!.ordering).toBe(4);
    });

    it('should only reorder deployment requests from the same platform', async () => {
      const previousDeploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 3,
            hub_status: DeploymentRequestHubStatus.Queued,
            platform_identifier: PlatformIdentifier.Openaev,
          }
        );
      const selectedDeploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 4,
            hub_status: DeploymentRequestHubStatus.Queued,
          }
        );

      await DeploymentRequestDomain.reorderDeploymentRequestUp(
        selectedDeploymentRequest!
      );
      const resultPreviousDeploymentRequest =
        await DeploymentRequestDomain.loadDeploymentRequestBy({
          id: previousDeploymentRequest!.id,
        });
      const resultSelectedDeploymentRequest =
        await DeploymentRequestDomain.loadDeploymentRequestBy({
          id: selectedDeploymentRequest!.id,
        });

      expect(resultPreviousDeploymentRequest).toBeDefined();
      expect(resultPreviousDeploymentRequest!.ordering).toBe(3);

      expect(resultSelectedDeploymentRequest).toBeDefined();
      expect(resultSelectedDeploymentRequest!.ordering).toBe(4);
    });
    it('should swap a bundle with the bundle right above it in its region queue', async () => {
      // Given
      const firstBundle = await createQueuedBundle(1);
      const secondBundle = await createQueuedBundle(2);

      // When
      await DeploymentRequestDomain.reorderDeploymentRequestUp(secondBundle!);

      // Then
      await TestHelper.deploymentRequest.assertProperties(secondBundle!.id, {
        ordering: 1,
      });
      await TestHelper.deploymentRequest.assertProperties(firstBundle!.id, {
        ordering: 2,
      });
    });

    it('should only reorder bundles from the same region', async () => {
      // Given
      const euWestBundle =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            type: DeploymentRequestDeploymentType.Bundle,
            platform_identifier: null,
            region: DeploymentRequestPlatformRegion.EuWest,
            ordering: 1,
            hub_status: DeploymentRequestHubStatus.Queued,
          }
        );
      const usEastBundle = await createQueuedBundle(2);

      // When
      await DeploymentRequestDomain.reorderDeploymentRequestUp(usEastBundle!);

      // Then
      await TestHelper.deploymentRequest.assertProperties(usEastBundle!.id, {
        ordering: 2,
      });
      await TestHelper.deploymentRequest.assertProperties(euWestBundle!.id, {
        ordering: 1,
      });
    });
  });

  describe('getMaxOrderingInQueue', () => {
    const queueOf = (region: DeploymentRequestPlatformRegion): QuotaKey => ({
      type: DeploymentRequestDeploymentType.Trial,
      platformIdentifier: PlatformIdentifier.Opencti,
      region,
    });

    const createQueuedTrial = (
      region: DeploymentRequestPlatformRegion,
      ordering: number
    ) =>
      TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription({
        type: DeploymentRequestDeploymentType.Trial,
        platform_identifier: PlatformIdentifier.Opencti,
        region,
        ordering,
        hub_status: DeploymentRequestHubStatus.Queued,
      });

    it('should number each region queue on its own, so two regions can share a rank', async () => {
      // Given
      await createQueuedTrial(DeploymentRequestPlatformRegion.EuWest, 1);
      await createQueuedTrial(DeploymentRequestPlatformRegion.EuWest, 2);

      // When
      const euWest = await DeploymentRequestDomain.getMaxOrderingInQueue(
        queueOf(DeploymentRequestPlatformRegion.EuWest),
        DeploymentRequestHubStatus.Queued
      );
      const usEast = await DeploymentRequestDomain.getMaxOrderingInQueue(
        queueOf(DeploymentRequestPlatformRegion.UsEast),
        DeploymentRequestHubStatus.Queued
      );

      // Then
      expect(euWest).toBe(2);
      expect(usEast).toBeNull();
    });

    it('should ignore the bundle products, they follow their bundle instead of holding a rank', async () => {
      // Given
      const bundle =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            type: DeploymentRequestDeploymentType.Bundle,
            platform_identifier: null,
            region: DeploymentRequestPlatformRegion.EuWest,
            ordering: 1,
            hub_status: DeploymentRequestHubStatus.Queued,
          }
        );
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          type: DeploymentRequestDeploymentType.Trial,
          platform_identifier: PlatformIdentifier.Opencti,
          region: DeploymentRequestPlatformRegion.EuWest,
          ordering: 9,
          hub_status: DeploymentRequestHubStatus.Queued,
          parent_id: bundle!.id,
        }
      );

      // When
      const maxOrdering = await DeploymentRequestDomain.getMaxOrderingInQueue(
        queueOf(DeploymentRequestPlatformRegion.EuWest),
        DeploymentRequestHubStatus.Queued
      );

      // Then
      expect(maxOrdering).toBeNull();
    });
  });

  describe('reorderDeploymentRequestToTop', async () => {
    const BUNDLE_QUEUE_REGION = DeploymentRequestPlatformRegion.UsEast;

    const createQueuedBundle = (ordering: number) =>
      TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription({
        type: DeploymentRequestDeploymentType.Bundle,
        platform_identifier: null,
        region: BUNDLE_QUEUE_REGION,
        ordering,
        hub_status: DeploymentRequestHubStatus.Queued,
      });
    it('should do nothing when deployment request is the top one', async () => {
      const topDeploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 1,
            hub_status: DeploymentRequestHubStatus.Queued,
          }
        );
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          ordering: 2,
          hub_status: DeploymentRequestHubStatus.Queued,
        }
      );

      await DeploymentRequestDomain.reorderDeploymentRequestToTop(
        topDeploymentRequest!
      );
      const resultDeploymentRequest =
        await DeploymentRequestDomain.loadDeploymentRequestBy({
          id: topDeploymentRequest!.id,
        });

      expect(resultDeploymentRequest).toBeDefined();
      expect(resultDeploymentRequest!.ordering).toBe(1);
    });

    it('should reorder deployment request to top', async () => {
      const topDeploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 3,
            hub_status: DeploymentRequestHubStatus.Queued,
          }
        );
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          ordering: 4,
          hub_status: DeploymentRequestHubStatus.Queued,
        }
      );
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          ordering: 5,
          hub_status: DeploymentRequestHubStatus.Queued,
        }
      );
      const selectedDeploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 6,
            hub_status: DeploymentRequestHubStatus.Queued,
          }
        );

      await DeploymentRequestDomain.reorderDeploymentRequestToTop(
        selectedDeploymentRequest!
      );
      const resultSelectedDeploymentRequest =
        await DeploymentRequestDomain.loadDeploymentRequestBy({
          id: selectedDeploymentRequest!.id,
        });

      const resultTopDeploymentRequest =
        await DeploymentRequestDomain.loadDeploymentRequestBy({
          id: topDeploymentRequest!.id,
        });

      expect(resultSelectedDeploymentRequest).toBeDefined();
      expect(resultSelectedDeploymentRequest!.ordering).toBe(1);

      expect(resultTopDeploymentRequest).toBeDefined();
      expect(resultTopDeploymentRequest!.ordering).toBe(4);
    });

    it('should only reorder queued deployment requests', async () => {
      const topDeploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 3,
            hub_status: DeploymentRequestHubStatus.Queued,
          }
        );
      const secondDeploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 4,
          }
        );
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          ordering: 5,
        }
      );
      const selectedDeploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 6,
            hub_status: DeploymentRequestHubStatus.Queued,
          }
        );

      await DeploymentRequestDomain.reorderDeploymentRequestToTop(
        selectedDeploymentRequest!
      );
      const resultSelectedDeploymentRequest =
        await DeploymentRequestDomain.loadDeploymentRequestBy({
          id: selectedDeploymentRequest!.id,
        });

      const resultSecondDeploymentRequest =
        await DeploymentRequestDomain.loadDeploymentRequestBy({
          id: secondDeploymentRequest!.id,
        });

      const resultTopDeploymentRequest =
        await DeploymentRequestDomain.loadDeploymentRequestBy({
          id: topDeploymentRequest!.id,
        });

      expect(resultSelectedDeploymentRequest).toBeDefined();
      expect(resultSelectedDeploymentRequest!.ordering).toBe(1);

      expect(resultSecondDeploymentRequest).toBeDefined();
      expect(resultSecondDeploymentRequest!.ordering).toBe(
        secondDeploymentRequest!.ordering
      );

      expect(resultTopDeploymentRequest).toBeDefined();
      expect(resultTopDeploymentRequest!.ordering).toBe(4);
    });

    it('should only reorder deployment requests from same platform identifier', async () => {
      const topDeploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 3,
            platform_identifier: PlatformIdentifier.Openaev,
            hub_status: DeploymentRequestHubStatus.Queued,
          }
        );
      const secondDeploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 4,
            hub_status: DeploymentRequestHubStatus.Queued,
          }
        );
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          ordering: 5,
          hub_status: DeploymentRequestHubStatus.Queued,
        }
      );
      const selectedDeploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 6,
            platform_identifier: PlatformIdentifier.Openaev,
            hub_status: DeploymentRequestHubStatus.Queued,
          }
        );

      await DeploymentRequestDomain.reorderDeploymentRequestToTop(
        selectedDeploymentRequest!
      );
      const resultSelectedDeploymentRequest =
        await DeploymentRequestDomain.loadDeploymentRequestBy({
          id: selectedDeploymentRequest!.id,
        });

      const resultSecondDeploymentRequest =
        await DeploymentRequestDomain.loadDeploymentRequestBy({
          id: secondDeploymentRequest!.id,
        });

      const resultTopDeploymentRequest =
        await DeploymentRequestDomain.loadDeploymentRequestBy({
          id: topDeploymentRequest!.id,
        });

      expect(resultSelectedDeploymentRequest).toBeDefined();
      expect(resultSelectedDeploymentRequest!.ordering).toBe(1);

      expect(resultSecondDeploymentRequest).toBeDefined();
      expect(resultSecondDeploymentRequest!.ordering).toBe(
        secondDeploymentRequest!.ordering
      );

      expect(resultTopDeploymentRequest).toBeDefined();
      expect(resultTopDeploymentRequest!.ordering).toBe(4);
    });
    it('should move a bundle to the top and push down the other bundles of its region', async () => {
      // Given
      const firstBundle = await createQueuedBundle(1);
      const secondBundle = await createQueuedBundle(2);
      const thirdBundle = await createQueuedBundle(3);

      // When
      await DeploymentRequestDomain.reorderDeploymentRequestToTop(thirdBundle!);

      // Then
      await TestHelper.deploymentRequest.assertProperties(thirdBundle!.id, {
        ordering: 1,
      });
      await TestHelper.deploymentRequest.assertProperties(firstBundle!.id, {
        ordering: 2,
      });
      await TestHelper.deploymentRequest.assertProperties(secondBundle!.id, {
        ordering: 3,
      });
    });
  });
  describe('loadLastPendingRequest and setRequestAsQueued', () => {
    const queueLastPendingRequest = async (key: QuotaKey) => {
      const request = await DeploymentRequestDomain.loadLastPendingRequest(key);
      if (!request) {
        return undefined;
      }

      return DeploymentRequestDomain.setRequestAsQueued(request);
    };

    let platformIdentifier: PlatformIdentifier;
    let region: DeploymentRequestPlatformRegion;
    let deploymentRequestId1: DeploymentRequestId;
    let deploymentRequestId2: DeploymentRequestId;
    let deploymentRequestId3: DeploymentRequestId;
    let deploymentRequestId4: DeploymentRequestId;
    beforeEach(async () => {
      const deploymentRequest1 =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 3,
            hub_status: DeploymentRequestHubStatus.Queued,
            target_state: DeploymentRequestPlatformState.Unprovisioned,
          }
        );
      deploymentRequestId1 = deploymentRequest1!.id;
      platformIdentifier = deploymentRequest1!.platform_identifier!;
      region = deploymentRequest1!.region;

      const deploymentRequest2 =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 4,
            hub_status: DeploymentRequestHubStatus.Pending,
            target_state: DeploymentRequestPlatformState.Active,
          }
        );
      deploymentRequestId2 = deploymentRequest2!.id;

      const deploymentRequest3 =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 5,
            hub_status: DeploymentRequestHubStatus.Pending,
            target_state: DeploymentRequestPlatformState.Active,
          }
        );
      deploymentRequestId3 = deploymentRequest3!.id;

      const deploymentRequest4 =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 6,
            hub_status: DeploymentRequestHubStatus.Queued,
            target_state: DeploymentRequestPlatformState.Unprovisioned,
          }
        );
      deploymentRequestId4 = deploymentRequest4!.id;
    });

    it('should leave the ranks of the other regions untouched', async () => {
      // Given
      const euWestQueued =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 1,
            hub_status: DeploymentRequestHubStatus.Queued,
            target_state: DeploymentRequestPlatformState.Unprovisioned,
            platform_identifier: platformIdentifier,
            region: DeploymentRequestPlatformRegion.EuWest,
          }
        );

      // When
      await queueLastPendingRequest(trialQuotaKey(platformIdentifier, region));

      // Then
      await TestHelper.deploymentRequest.assertProperties(euWestQueued!.id, {
        ordering: 1,
      });
    });

    it('should update the last request in platform and region', async () => {
      const openAEVDeploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 4,
            hub_status: DeploymentRequestHubStatus.Queued,
            target_state: DeploymentRequestPlatformState.Unprovisioned,
            platform_identifier: PlatformIdentifier.Openaev,
          }
        );

      const updatedRequest = await queueLastPendingRequest(
        trialQuotaKey(platformIdentifier, region)
      );

      expect(updatedRequest).toBeDefined();
      expect(updatedRequest!.id).toBe(deploymentRequestId3);

      await TestHelper.deploymentRequest.assertProperties(
        deploymentRequestId1,
        {
          hub_status: DeploymentRequestHubStatus.Queued,
          target_state: DeploymentRequestPlatformState.Unprovisioned,
        }
      );

      await TestHelper.deploymentRequest.assertProperties(
        deploymentRequestId2,
        {
          hub_status: DeploymentRequestHubStatus.Pending,
          target_state: DeploymentRequestPlatformState.Active,
        }
      );

      await TestHelper.deploymentRequest.assertProperties(
        deploymentRequestId3,
        {
          hub_status: DeploymentRequestHubStatus.Queued,
          target_state: DeploymentRequestPlatformState.Removed,
        }
      );

      await TestHelper.deploymentRequest.assertProperties(
        deploymentRequestId4,
        {
          hub_status: DeploymentRequestHubStatus.Queued,
          target_state: DeploymentRequestPlatformState.Unprovisioned,
        }
      );

      await TestHelper.deploymentRequest.assertProperties(
        openAEVDeploymentRequest!.id,
        {
          hub_status: DeploymentRequestHubStatus.Queued,
          ordering: openAEVDeploymentRequest!.ordering,
        }
      );
    });

    it('should set pending requests in the right order with queued requests', async () => {
      await queueLastPendingRequest(trialQuotaKey(platformIdentifier, region));

      await TestHelper.deploymentRequest.assertProperties(
        deploymentRequestId1,
        {
          ordering: 4,
        }
      );

      await TestHelper.deploymentRequest.assertProperties(
        deploymentRequestId2,
        {
          ordering: 4,
        }
      );

      await TestHelper.deploymentRequest.assertProperties(
        deploymentRequestId3,
        {
          ordering: 1,
        }
      );

      await TestHelper.deploymentRequest.assertProperties(
        deploymentRequestId4,
        {
          ordering: 7,
        }
      );
    });

    it('should do nothing when there is no pending requests', async () => {
      await TestHelper.deploymentRequest.update({
        hub_status: DeploymentRequestHubStatus.Queued,
      });

      const updatedRequest = await queueLastPendingRequest(
        trialQuotaKey(platformIdentifier, region)
      );

      expect(updatedRequest).toBeUndefined();

      await TestHelper.deploymentRequest.assertProperties(
        deploymentRequestId1,
        {
          ordering: 3,
        }
      );

      await TestHelper.deploymentRequest.assertProperties(
        deploymentRequestId2,
        {
          ordering: 4,
        }
      );

      await TestHelper.deploymentRequest.assertProperties(
        deploymentRequestId3,
        {
          ordering: 5,
        }
      );

      await TestHelper.deploymentRequest.assertProperties(
        deploymentRequestId4,
        {
          ordering: 6,
        }
      );
    });
  });

  describe('loadFirstQueuedRequest', () => {
    it('should return the queued request with the lowest ordering', async () => {
      const deploymentRequest1 =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 3,
            hub_status: DeploymentRequestHubStatus.Queued,
            target_state: DeploymentRequestPlatformState.Unprovisioned,
          }
        );
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          ordering: 6,
          hub_status: DeploymentRequestHubStatus.Queued,
          target_state: DeploymentRequestPlatformState.Unprovisioned,
        }
      );
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          ordering: 1,
          hub_status: DeploymentRequestHubStatus.Pending,
          target_state: DeploymentRequestPlatformState.Active,
        }
      );

      const request = await DeploymentRequestDomain.loadFirstQueuedRequest(
        trialQuotaKey(
          deploymentRequest1!.platform_identifier!,
          deploymentRequest1!.region
        )
      );

      expect(request?.id).toBe(deploymentRequest1!.id);
    });

    it('should ignore queued requests from another region', async () => {
      const usEastRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 3,
            hub_status: DeploymentRequestHubStatus.Queued,
            target_state: DeploymentRequestPlatformState.Unprovisioned,
            region: DeploymentRequestPlatformRegion.UsEast,
          }
        );
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          ordering: 1,
          hub_status: DeploymentRequestHubStatus.Queued,
          target_state: DeploymentRequestPlatformState.Unprovisioned,
          region: DeploymentRequestPlatformRegion.EuWest,
        }
      );

      const request = await DeploymentRequestDomain.loadFirstQueuedRequest(
        trialQuotaKey(
          usEastRequest!.platform_identifier!,
          DeploymentRequestPlatformRegion.UsEast
        )
      );

      expect(request?.id).toBe(usEastRequest!.id);
    });

    it('should ignore queued requests from another platform', async () => {
      const openctiRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 3,
            hub_status: DeploymentRequestHubStatus.Queued,
            target_state: DeploymentRequestPlatformState.Unprovisioned,
            platform_identifier: PlatformIdentifier.Opencti,
          }
        );
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          ordering: 1,
          hub_status: DeploymentRequestHubStatus.Queued,
          target_state: DeploymentRequestPlatformState.Unprovisioned,
          platform_identifier: PlatformIdentifier.Openaev,
        }
      );

      const request = await DeploymentRequestDomain.loadFirstQueuedRequest(
        trialQuotaKey(PlatformIdentifier.Opencti, openctiRequest!.region)
      );

      expect(request?.id).toBe(openctiRequest!.id);
    });
  });

  describe('setRequestAsPending', () => {
    it('should move the request to pending, after the last pending one', async () => {
      const deploymentRequest1 =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 3,
            hub_status: DeploymentRequestHubStatus.Queued,
            target_state: DeploymentRequestPlatformState.Unprovisioned,
          }
        );
      const deploymentRequest2 =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 4,
            hub_status: DeploymentRequestHubStatus.Pending,
            target_state: DeploymentRequestPlatformState.Active,
          }
        );
      const deploymentRequest3 =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 5,
            hub_status: DeploymentRequestHubStatus.Pending,
            target_state: DeploymentRequestPlatformState.Active,
          }
        );
      const deploymentRequest4 =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            ordering: 6,
            hub_status: DeploymentRequestHubStatus.Queued,
            target_state: DeploymentRequestPlatformState.Unprovisioned,
          }
        );

      const updatedDeploymentRequest =
        await DeploymentRequestDomain.setRequestAsPending(deploymentRequest1!);

      expect(updatedDeploymentRequest).toBeDefined();
      expect(updatedDeploymentRequest!.id).toBe(deploymentRequest1!.id);
      expect(updatedDeploymentRequest!.hub_status).toBe(
        DeploymentRequestHubStatus.Pending
      );
      expect(updatedDeploymentRequest!.target_state).toBe(
        DeploymentRequestHubStatus.Active
      );

      await TestHelper.deploymentRequest.assertProperties(
        deploymentRequest1!.id,
        {
          hub_status: DeploymentRequestHubStatus.Pending,
          target_state: DeploymentRequestPlatformState.Active,
          ordering: 6,
        }
      );

      await TestHelper.deploymentRequest.assertProperties(
        deploymentRequest2!.id,
        {
          hub_status: DeploymentRequestHubStatus.Pending,
          target_state: DeploymentRequestPlatformState.Active,
          ordering: 4,
        }
      );

      await TestHelper.deploymentRequest.assertProperties(
        deploymentRequest3!.id,
        {
          hub_status: DeploymentRequestHubStatus.Pending,
          target_state: DeploymentRequestPlatformState.Active,
          ordering: 5,
        }
      );

      await TestHelper.deploymentRequest.assertProperties(
        deploymentRequest4!.id,
        {
          hub_status: DeploymentRequestHubStatus.Queued,
          target_state: DeploymentRequestPlatformState.Unprovisioned,
          ordering: 6,
        }
      );
    });

    it('should cascade to the queued children when the promoted request is a bundle', async () => {
      const region = DeploymentRequestPlatformRegion.UsEast;
      const bundle =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            type: DeploymentRequestDeploymentType.Bundle,
            platform_identifier: null,
            region,
            ordering: 1,
            hub_status: DeploymentRequestHubStatus.Queued,
            target_state: DeploymentRequestPlatformState.Unprovisioned,
          }
        );
      const queuedChild =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            parent_id: bundle!.id,
            platform_identifier: PlatformIdentifier.Opencti,
            region,
            hub_status: DeploymentRequestHubStatus.Queued,
            target_state: DeploymentRequestPlatformState.Unprovisioned,
          }
        );
      const cancelledChild =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            parent_id: bundle!.id,
            platform_identifier: PlatformIdentifier.Xtmone,
            region,
            hub_status: DeploymentRequestHubStatus.Cancelled,
            target_state: DeploymentRequestPlatformState.Unprovisioned,
          }
        );

      const promotedRequest = await DeploymentRequestDomain.setRequestAsPending(
        bundle!
      );

      expect(promotedRequest?.id).toBe(bundle!.id);
      await TestHelper.deploymentRequest.assertProperties(bundle!.id, {
        hub_status: DeploymentRequestHubStatus.Pending,
        target_state: DeploymentRequestPlatformState.Active,
      });
      await TestHelper.deploymentRequest.assertProperties(queuedChild!.id, {
        hub_status: DeploymentRequestHubStatus.Pending,
        target_state: DeploymentRequestPlatformState.Active,
      });
      await TestHelper.deploymentRequest.assertProperties(cancelledChild!.id, {
        hub_status: DeploymentRequestHubStatus.Cancelled,
        target_state: DeploymentRequestPlatformState.Unprovisioned,
      });
    });
  });

  describe('initialiseServiceGroup', () => {
    afterEach(async () => {
      vi.restoreAllMocks();
      await TestHelper.deploymentRequest.deleteAllWithServiceInstanceAndSubscription();
    });

    const createDeploymentRequest = (platformIdentifier: PlatformIdentifier) =>
      TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription({
        platform_identifier: platformIdentifier,
        platform_id: uuidv4(),
        hub_status: DeploymentRequestHubStatus.Active,
        type: DeploymentRequestDeploymentType.Trial,
      });

    const spyOnAuth0AndServiceGroup = () => {
      const createAudienceSpy = vi
        .spyOn(auth0Client, 'createAudienceAPI')
        .mockResolvedValue();
      vi.spyOn(auth0Client, 'updateUserRBACInstance').mockResolvedValue();
      vi.spyOn(ServiceGroupDomain, 'initGroupWithAdmin').mockResolvedValue();
      return { createAudienceSpy };
    };

    it.each`
      platformIdentifier            | shouldCreateAudience
      ${PlatformIdentifier.Openaev} | ${false}
      ${PlatformIdentifier.Opencti} | ${false}
      ${PlatformIdentifier.Xtmone}  | ${false}
    `(
      'should create an Auth0 audience for a $platformIdentifier instance: $shouldCreateAudience',
      async ({ platformIdentifier, shouldCreateAudience }) => {
        const deployment = await createDeploymentRequest(platformIdentifier);
        const { createAudienceSpy } = spyOnAuth0AndServiceGroup();

        await DeploymentRequestDomain.initialiseServiceGroup(
          deployment!.id,
          platformIdentifier
        );

        if (shouldCreateAudience) {
          expect(createAudienceSpy).toHaveBeenCalledOnce();
        } else {
          expect(createAudienceSpy).not.toHaveBeenCalled();
        }
      }
    );
  });

  describe('countDeploymentRequestsBy', () => {
    const REQUESTER_ID = TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID;
    const OTHER_USER_ID = TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE.ID;

    afterEach(async () => {
      await TestHelper.deploymentRequest.deleteAllWithServiceInstanceAndSubscription();
    });

    it('should return 0 when no deployment request matches the given conditions', async () => {
      const count = await DeploymentRequestDomain.countDeploymentRequestsBy({
        user_requester_id: uuidv4() as UserId,
      });

      expect(count).toBe(0);
    });

    it('should count only deployment requests matching the given conditions', async () => {
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        { user_requester_id: REQUESTER_ID, cancellation_user_id: null }
      );
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        { user_requester_id: REQUESTER_ID, cancellation_user_id: REQUESTER_ID }
      );
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        { user_requester_id: OTHER_USER_ID, cancellation_user_id: REQUESTER_ID }
      );

      const countByRequester =
        await DeploymentRequestDomain.countDeploymentRequestsBy({
          user_requester_id: REQUESTER_ID,
        });
      const countByCanceller =
        await DeploymentRequestDomain.countDeploymentRequestsBy({
          cancellation_user_id: REQUESTER_ID,
        });

      expect(countByRequester).toBe(2);
      expect(countByCanceller).toBe(2);
    });
  });

  describe('loadOngoingStandaloneTrialsForOrganization', () => {
    const ORGANIZATION_ID = TEST_ORGANIZATIONS.FILIGRAN.ID;
    const OTHER_ORGANIZATION_ID = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID;

    afterEach(async () => {
      await TestHelper.deploymentRequest.deleteAllWithServiceInstanceAndSubscription();
    });

    it.each([
      DeploymentRequestHubStatus.Queued,
      DeploymentRequestHubStatus.Pending,
      DeploymentRequestHubStatus.Provisioning,
      DeploymentRequestHubStatus.Active,
    ])(
      'should return the standalone trial when its status is %s',
      async (hubStatus) => {
        // Given a standalone trial in an ongoing status
        const standalone =
          await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            { hub_status: hubStatus }
          );

        // When loading the ongoing standalone trials of the organization
        const ongoing =
          await DeploymentRequestDomain.loadOngoingStandaloneTrialsForOrganization(
            ORGANIZATION_ID
          );

        // Then the trial is returned
        expect(ongoing.map(({ id }) => id)).toEqual([standalone.id]);
      }
    );

    it.each([
      DeploymentRequestHubStatus.Cancelled,
      DeploymentRequestHubStatus.Expired,
      DeploymentRequestHubStatus.Failed,
    ])(
      'should not return the standalone trial when its status is %s',
      async (hubStatus) => {
        // Given a standalone trial in a terminal status
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          { hub_status: hubStatus }
        );

        // When loading the ongoing standalone trials of the organization
        const ongoing =
          await DeploymentRequestDomain.loadOngoingStandaloneTrialsForOrganization(
            ORGANIZATION_ID
          );

        // Then nothing is returned
        expect(ongoing).toEqual([]);
      }
    );

    it('should not return a bundle nor its products when the organization has an active bundle', async () => {
      // Given an active bundle with an active child
      const bundle =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            type: DeploymentRequestDeploymentType.Bundle,
            platform_identifier: null,
            hub_status: DeploymentRequestHubStatus.Active,
          }
        );
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          parent_id: bundle.id,
          hub_status: DeploymentRequestHubStatus.Active,
        }
      );

      // When loading the ongoing standalone trials of the organization
      const ongoing =
        await DeploymentRequestDomain.loadOngoingStandaloneTrialsForOrganization(
          ORGANIZATION_ID
        );

      // Then nothing is returned
      expect(ongoing).toEqual([]);
    });

    it('should not return the trials of another organization', async () => {
      // Given an ongoing standalone trial owned by another organization
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          organization_requester_id: OTHER_ORGANIZATION_ID,
          hub_status: DeploymentRequestHubStatus.Active,
        }
      );

      // When loading the ongoing standalone trials of the organization
      const ongoing =
        await DeploymentRequestDomain.loadOngoingStandaloneTrialsForOrganization(
          ORGANIZATION_ID
        );

      // Then nothing is returned
      expect(ongoing).toEqual([]);
    });

    it('should return every ongoing standalone trial when the organization has several', async () => {
      // Given two ongoing standalone trials on different products
      const openctiTrial =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          { hub_status: DeploymentRequestHubStatus.Active }
        );
      const openaevTrial =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            platform_identifier: PlatformIdentifier.Openaev,
            hub_status: DeploymentRequestHubStatus.Pending,
          }
        );

      // When loading the ongoing standalone trials of the organization
      const ongoing =
        await DeploymentRequestDomain.loadOngoingStandaloneTrialsForOrganization(
          ORGANIZATION_ID
        );

      // Then both are returned
      expect(ongoing.map(({ id }) => id).sort()).toEqual(
        [openctiTrial.id, openaevTrial.id].sort()
      );
    });
  });

  describe('shouldDeleteDeploymentRequestAudience', () => {
    it('should return false for a bundle', () => {
      expect(
        shouldDeleteDeploymentRequestAudience({
          type: DeploymentRequestDeploymentType.Bundle,
          platform_identifier: null,
          parent_id: null,
        })
      ).toBe(false);
    });

    it('should return false for an xtmone trial', () => {
      expect(
        shouldDeleteDeploymentRequestAudience({
          type: DeploymentRequestDeploymentType.Trial,
          platform_identifier: PlatformIdentifier.Xtmone,
          parent_id: null,
        })
      ).toBe(false);
    });

    it('should return false for an openaev bundle child', () => {
      expect(
        shouldDeleteDeploymentRequestAudience({
          type: DeploymentRequestDeploymentType.Trial,
          platform_identifier: PlatformIdentifier.Openaev,
          parent_id: uuidv4() as DeploymentRequestId,
        })
      ).toBe(false);
    });

    it('should return true for a standalone openaev trial', () => {
      expect(
        shouldDeleteDeploymentRequestAudience({
          type: DeploymentRequestDeploymentType.Trial,
          platform_identifier: PlatformIdentifier.Openaev,
          parent_id: null,
        })
      ).toBe(true);
    });

    it.each`
      description
      ${'standalone'}
      ${'bundle child'}
    `(
      'should return true for an opencti $description trial',
      ({ description }) => {
        expect(
          shouldDeleteDeploymentRequestAudience({
            type: DeploymentRequestDeploymentType.Trial,
            platform_identifier: PlatformIdentifier.Opencti,
            parent_id:
              description === 'bundle child'
                ? (uuidv4() as DeploymentRequestId)
                : null,
          })
        ).toBe(true);
      }
    );
  });
});
