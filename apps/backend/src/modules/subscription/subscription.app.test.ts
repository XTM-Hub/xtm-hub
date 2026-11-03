import { toGlobalId } from 'graphql-relay/node/node.js';
import { v4 as uuidv4 } from 'uuid';
import { beforeEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  // eslint-disable-next-line no-restricted-imports
  requestContextAdminUser,
  requestContextSimpleUserSecondOrga,
  SERVICES,
  TEST_ORGANIZATIONS,
  TEST_SUBSCRIPTIONS,
} from '../../../tests/tests.const';
import {
  OrderingMode,
  ServiceInstanceTag,
  SubscriptionFilterKey,
  SubscriptionOrdering,
} from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { ServiceCapabilityId } from '../../model/kanel/public/ServiceCapability';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { SubscriptionId } from '../../model/kanel/public/Subscription';
import { UserLoadUserBy } from '../../model/user';
import { ErrorCode } from '../../utils/error/error.code';
import { SubscriptionCapabilityDomain } from '../security-management/subscription-capability/subscription-capability.domain';
import { subscriptionApp } from './subscription.app';
import { SubscriptionDomain } from './subscription.domain';

describe('subscription app', () => {
  describe('subscribeOrganizationsToService', async () => {
    let serviceInstanceId: ServiceInstanceId;

    beforeEach(async () => {
      serviceInstanceId = uuidv4() as ServiceInstanceId;
      await TestHelper.serviceInstance.create({
        id: serviceInstanceId,
        name: 'test-multi-org',
      });
    });

    it('should create one subscription per organization id', async () => {
      await subscriptionApp.subscribeOrganizationsToService({
        organizationIds: [
          TEST_ORGANIZATIONS.FILIGRAN.ID,
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        ],
        serviceInstanceId,
        startDate: new Date(),
        endDate: new Date(),
        capabilityIds: [],
      });

      const filigranSubscription = await TestHelper.subscription.load({
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: serviceInstanceId,
      });
      const secondOrganizationSubscription = await TestHelper.subscription.load(
        {
          organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          service_instance_id: serviceInstanceId,
        }
      );

      expect(filigranSubscription).toBeDefined();
      expect(secondOrganizationSubscription).toBeDefined();
    });

    it('should rollback all creations when one organization is already subscribed', async () => {
      await SubscriptionDomain.createSubscription({
        id: uuidv4() as SubscriptionId,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        service_instance_id: serviceInstanceId,
        start_date: new Date(),
        end_date: new Date(),
      });

      const call = subscriptionApp.subscribeOrganizationsToService({
        organizationIds: [
          TEST_ORGANIZATIONS.FILIGRAN.ID,
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        ],
        serviceInstanceId,
        startDate: new Date(),
        endDate: new Date(),
        capabilityIds: [],
      });

      await expect(call).rejects.toThrow(ErrorCode.AlreadySubscribed);

      const filigranSubscription = await TestHelper.subscription.load({
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: serviceInstanceId,
      });

      expect(filigranSubscription).toBeUndefined();
    });
  });

  describe(`${subscriptionApp.updateSubscription.name}`, () => {
    let serviceInstanceId: ServiceInstanceId;

    beforeEach(async () => {
      serviceInstanceId = uuidv4() as ServiceInstanceId;
      await TestHelper.serviceInstance.create({
        id: serviceInstanceId,
        name: 'test-update',
      });
    });

    it('should update only dates and keep existing capabilities', async () => {
      const id = uuidv4() as SubscriptionId;
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-10');
      const newStartDate = new Date('2026-03-01');
      const newEndDate = new Date('2026-03-10');

      await SubscriptionDomain.createSubscription({
        id,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: serviceInstanceId,
        start_date: startDate,
        end_date: endDate,
      });
      await SubscriptionCapabilityDomain.addCapabilitiesToSubscription(id, [
        SERVICES.INSTANCES.INTEGRATIONS.CAPABILITIES.UPLOAD.ID,
        SERVICES.INSTANCES.INTEGRATIONS.CAPABILITIES.DELETE.ID,
      ]);

      await subscriptionApp.updateSubscription({
        id,
        startDate: newStartDate,
        endDate: newEndDate,
      });

      const updatedSubscription = await TestHelper.subscription.load({ id });
      expect(updatedSubscription).toBeDefined();
      expect(updatedSubscription?.start_date?.toISOString().slice(0, 10)).toBe(
        '2026-03-01'
      );
      expect(updatedSubscription?.end_date?.toISOString().slice(0, 10)).toBe(
        '2026-03-10'
      );

      const capabilities =
        await SubscriptionCapabilityDomain.loadSubscriptionCapabilities(id);
      expect(capabilities).toHaveLength(2);
    });

    it('should replace only capabilities and keep existing dates', async () => {
      const id = uuidv4() as SubscriptionId;
      const startDate = new Date('2026-02-01');
      const endDate = new Date('2026-02-10');

      await SubscriptionDomain.createSubscription({
        id,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: serviceInstanceId,
        start_date: startDate,
        end_date: endDate,
      });
      await SubscriptionCapabilityDomain.addCapabilitiesToSubscription(id, [
        SERVICES.INSTANCES.INTEGRATIONS.CAPABILITIES.UPLOAD.ID,
      ]);

      await subscriptionApp.updateSubscription({
        id,
        capabilityIds: [SERVICES.INSTANCES.INTEGRATIONS.CAPABILITIES.DELETE.ID],
      });

      const updatedSubscription = await TestHelper.subscription.load({ id });
      expect(updatedSubscription?.start_date?.toISOString().slice(0, 10)).toBe(
        '2026-02-01'
      );
      expect(updatedSubscription?.end_date?.toISOString().slice(0, 10)).toBe(
        '2026-02-10'
      );

      const capabilities =
        await SubscriptionCapabilityDomain.loadSubscriptionCapabilities(id);
      expect(capabilities).toHaveLength(1);
      expect(capabilities[0].service_capability_id).toBe(
        SERVICES.INSTANCES.INTEGRATIONS.CAPABILITIES.DELETE.ID
      );
    });

    it('should rollback updated dates and capabilities replacement on invalid capability id', async () => {
      const id = uuidv4() as SubscriptionId;
      await SubscriptionDomain.createSubscription({
        id,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: serviceInstanceId,
        start_date: new Date('2026-04-01'),
        end_date: new Date('2026-04-30'),
      });
      await SubscriptionCapabilityDomain.addCapabilitiesToSubscription(id, [
        SERVICES.INSTANCES.INTEGRATIONS.CAPABILITIES.UPLOAD.ID,
      ]);

      const call = subscriptionApp.updateSubscription({
        id,
        startDate: new Date('2026-05-01'),
        capabilityIds: [uuidv4() as ServiceCapabilityId],
      });
      await expect(call).rejects.toThrow();

      const updatedSubscription = await TestHelper.subscription.load({ id });
      expect(updatedSubscription?.start_date?.toISOString().slice(0, 10)).toBe(
        '2026-04-01'
      );

      const capabilities =
        await SubscriptionCapabilityDomain.loadSubscriptionCapabilities(id);
      expect(capabilities).toHaveLength(1);
      expect(capabilities[0].service_capability_id).toBe(
        SERVICES.INSTANCES.INTEGRATIONS.CAPABILITIES.UPLOAD.ID
      );
    });
  });

  describe(`${subscriptionApp.loadSubscriptionModel.name}`, () => {
    it('should load the subscription for the selected organization only', async () => {
      const serviceInstanceId = uuidv4() as ServiceInstanceId;
      await TestHelper.serviceInstance.create({
        id: serviceInstanceId,
        name: 'test-load-model',
      });

      await SubscriptionDomain.createSubscription({
        id: uuidv4() as SubscriptionId,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: serviceInstanceId,
        start_date: new Date(),
        end_date: null,
      });

      const secondOrganizationSubscription =
        await SubscriptionDomain.createSubscription({
          id: uuidv4() as SubscriptionId,
          organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          service_instance_id: serviceInstanceId,
          start_date: new Date(),
          end_date: null,
        });

      const user = {
        selected_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      } as unknown as UserLoadUserBy;

      const loadedSubscription = await subscriptionApp.loadSubscriptionModel(
        user,
        serviceInstanceId
      );

      expect(loadedSubscription.id).toBe(secondOrganizationSubscription.id);
      expect(loadedSubscription.organization_id).toBe(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
      );
    });
  });

  describe(`${subscriptionApp.loadSubscriptions.name}`, () => {
    const serviceInstanceFilters = (ids: ServiceInstanceId[]) => [
      {
        key: SubscriptionFilterKey.ServiceInstanceId,
        value: ids.map((id) => toGlobalId('ServiceInstance', id)),
      },
    ];

    const createSubscription = async ({
      id = uuidv4() as SubscriptionId,
      organizationId,
      serviceInstanceId,
      startDate,
    }: {
      id?: SubscriptionId;
      organizationId: OrganizationId;
      serviceInstanceId: ServiceInstanceId;
      startDate: Date;
    }) => {
      return SubscriptionDomain.createSubscription({
        id,
        organization_id: organizationId,
        service_instance_id: serviceInstanceId,
        start_date: startDate,
        end_date: null,
      });
    };

    it('should sort subscriptions by related service name', async () => {
      const serviceAId = uuidv4() as ServiceInstanceId;
      const serviceBId = uuidv4() as ServiceInstanceId;

      await TestHelper.serviceInstance.create({
        id: serviceAId,
        name: 'aaa-service',
      });
      await TestHelper.serviceInstance.create({
        id: serviceBId,
        name: 'bbb-service',
      });

      await createSubscription({
        organizationId: TEST_ORGANIZATIONS.FILIGRAN.ID,
        serviceInstanceId: serviceAId,
        startDate: new Date('2026-01-01'),
      });
      await createSubscription({
        organizationId: TEST_ORGANIZATIONS.FILIGRAN.ID,
        serviceInstanceId: serviceBId,
        startDate: new Date('2026-01-01'),
      });

      const ascResult = await subscriptionApp.loadSubscriptions({
        first: 10,
        orderBy: SubscriptionOrdering.ServiceName,
        orderMode: OrderingMode.Asc,
        filters: serviceInstanceFilters([serviceAId, serviceBId]),
      });
      const descResult = await subscriptionApp.loadSubscriptions({
        first: 10,
        orderBy: SubscriptionOrdering.ServiceName,
        orderMode: OrderingMode.Desc,
        filters: serviceInstanceFilters([serviceAId, serviceBId]),
      });

      expect(
        ascResult.edges.map(({ node }) => node.service_instance_id)
      ).toEqual([serviceAId, serviceBId]);
      expect(
        descResult.edges.map(({ node }) => node.service_instance_id)
      ).toEqual([serviceBId, serviceAId]);
    });

    it('should search subscriptions by related organization name for a user with BYPASS', async () => {
      requestContext.set(requestContextAdminUser);
      const serviceId = uuidv4() as ServiceInstanceId;
      await TestHelper.serviceInstance.create({
        id: serviceId,
        name: 'search-by-org-service',
      });

      const firstSubscriptionId = uuidv4() as SubscriptionId;
      const secondSubscriptionId = uuidv4() as SubscriptionId;

      await createSubscription({
        id: firstSubscriptionId,
        organizationId: TEST_ORGANIZATIONS.FILIGRAN.ID,
        serviceInstanceId: serviceId,
        startDate: new Date('2026-02-01'),
      });
      await createSubscription({
        id: secondSubscriptionId,
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        serviceInstanceId: serviceId,
        startDate: new Date('2026-02-01'),
      });

      const result = await subscriptionApp.loadSubscriptions({
        first: 10,
        orderBy: SubscriptionOrdering.StartDate,
        orderMode: OrderingMode.Asc,
        searchTerm: 'second orga',
        filters: serviceInstanceFilters([serviceId]),
      });

      expect(Number(result.totalCount)).toBe(1);
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].node.id).toBe(secondSubscriptionId);
      expect(result.edges[0].node.id).not.toBe(firstSubscriptionId);
    });

    it('should search subscriptions by service tags', async () => {
      const openCtiServiceId = uuidv4() as ServiceInstanceId;
      const othersServiceId = uuidv4() as ServiceInstanceId;

      await TestHelper.serviceInstance.create({
        id: openCtiServiceId,
        name: 'service-a',
        tags: [ServiceInstanceTag.Trial],
      });
      await TestHelper.serviceInstance.create({
        id: othersServiceId,
        name: 'service-b',
        tags: [ServiceInstanceTag.Others],
      });

      const openCtiSubscriptionId = uuidv4() as SubscriptionId;
      await createSubscription({
        id: openCtiSubscriptionId,
        organizationId: TEST_ORGANIZATIONS.FILIGRAN.ID,
        serviceInstanceId: openCtiServiceId,
        startDate: new Date('2026-03-01'),
      });
      await createSubscription({
        organizationId: TEST_ORGANIZATIONS.FILIGRAN.ID,
        serviceInstanceId: othersServiceId,
        startDate: new Date('2026-03-01'),
      });

      const result = await subscriptionApp.loadSubscriptions({
        first: 10,
        orderBy: SubscriptionOrdering.StartDate,
        orderMode: OrderingMode.Asc,
        searchTerm: 'trial',
        filters: serviceInstanceFilters([openCtiServiceId, othersServiceId]),
      });

      expect(Number(result.totalCount)).toBe(1);
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].node.id).toBe(openCtiSubscriptionId);
    });

    describe('selected organization scope', () => {
      const filigranSubscription = TEST_SUBSCRIPTIONS.FILIGRAN_COMMUNITY;
      let serviceId: ServiceInstanceId;
      let secondOrganizationSubscriptionId: SubscriptionId;

      beforeEach(async () => {
        requestContext.set(requestContextSimpleUserSecondOrga);
        serviceId = uuidv4() as ServiceInstanceId;
        secondOrganizationSubscriptionId = uuidv4() as SubscriptionId;
        await TestHelper.serviceInstance.create({
          id: serviceId,
          name: 'organization-restriction-service',
        });
        await createSubscription({
          id: secondOrganizationSubscriptionId,
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          serviceInstanceId: serviceId,
          startDate: new Date('2026-04-01'),
        });
      });

      it('should only return subscriptions of the selected organization for a user without BYPASS', async () => {
        // When
        const result = await subscriptionApp.loadSubscriptions({
          first: 1000,
          orderBy: SubscriptionOrdering.StartDate,
          orderMode: OrderingMode.Asc,
        });

        // Then
        const nodes = result.edges.map(({ node }) => node);
        expect(new Set(nodes.map((node) => node.organization_id))).toEqual(
          new Set([TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID])
        );
        expect(Number(result.totalCount)).toBe(nodes.length);
        expect(nodes).toContainEqual(
          expect.objectContaining({
            id: secondOrganizationSubscriptionId,
            organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          })
        );
      });

      it.each([
        {
          label: 'an organization_id filter',
          options: {
            filters: [
              {
                key: SubscriptionFilterKey.OrganizationId,
                value: [
                  toGlobalId('Organization', TEST_ORGANIZATIONS.FILIGRAN.ID),
                ],
              },
            ],
          },
        },
        {
          label: 'a search term',
          options: { searchTerm: TEST_ORGANIZATIONS.FILIGRAN.NAME },
        },
      ])(
        'should only return the selected organization subscriptions with $label for a user without BYPASS',
        async ({ options }) => {
          // When
          const result = await subscriptionApp.loadSubscriptions({
            first: 1000,
            orderBy: SubscriptionOrdering.OrganizationName,
            orderMode: OrderingMode.Asc,
            ...options,
            filters: [
              ...serviceInstanceFilters([
                filigranSubscription.SERVICE_INSTANCE_ID,
              ]),
              ...(options.filters ?? []),
            ],
          });

          // Then
          expect(Number(result.totalCount)).toBe(0);
          expect(result.edges).toEqual([]);
        }
      );

      it('should return the subscriptions of all organizations for a user with BYPASS', async () => {
        // Given
        requestContext.set(requestContextAdminUser);

        // When
        const result = await subscriptionApp.loadSubscriptions({
          first: 10,
          orderBy: SubscriptionOrdering.OrganizationName,
          orderMode: OrderingMode.Asc,
          filters: serviceInstanceFilters([
            filigranSubscription.SERVICE_INSTANCE_ID,
            serviceId,
          ]),
        });

        // Then
        expect(Number(result.totalCount)).toBe(2);
        expect(result.edges.map(({ node }) => node)).toMatchObject([
          {
            id: filigranSubscription.ID,
            organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
          },
          {
            id: secondOrganizationSubscriptionId,
            organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          },
        ]);
      });
    });
  });

  describe(`${subscriptionApp.deleteSubscriptions.name}`, () => {
    it('should delete the subscription', async () => {
      const id = uuidv4() as SubscriptionId;
      const subscription = await SubscriptionDomain.createSubscription({
        id,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
        start_date: new Date(),
        end_date: null,
      });

      expect(subscription).toBeDefined();

      const deletedSubscription = await subscriptionApp.deleteSubscriptions([
        id,
      ]);
      expect(deletedSubscription).toStrictEqual([subscription]);
    });

    it('should delete linked subscription capabilities', async () => {
      const id = uuidv4() as SubscriptionId;
      await SubscriptionDomain.createSubscription({
        id,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
        start_date: new Date(),
        end_date: null,
      });
      await SubscriptionCapabilityDomain.addCapabilitiesToSubscription(id, [
        SERVICES.INSTANCES.INTEGRATIONS.CAPABILITIES.UPLOAD.ID,
      ]);

      await subscriptionApp.deleteSubscriptions([id]);

      const deletedSubscription = await TestHelper.subscription.load({ id });
      expect(deletedSubscription).toBeUndefined();

      const capabilities =
        await SubscriptionCapabilityDomain.loadSubscriptionCapabilities(id);
      expect(capabilities).toHaveLength(0);
    });
  });
});
