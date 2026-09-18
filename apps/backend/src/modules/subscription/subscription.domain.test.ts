import { v4 as uuidv4 } from 'uuid';
import { beforeEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import { SERVICES, TEST_ORGANIZATIONS } from '../../../tests/tests.const';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { ServiceCapabilityId } from '../../model/kanel/public/ServiceCapability';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { SubscriptionId } from '../../model/kanel/public/Subscription';
import { SubscriptionCapabilityId } from '../../model/kanel/public/SubscriptionCapability';
import { SubscriptionCapabilityDomain } from '../security-management/subscription-capability/subscription-capability.domain';
import { SubscriptionDomain } from './subscription.domain';

describe('subscription domain', () => {
  let serviceInstanceId: ServiceInstanceId;

  beforeEach(async () => {
    serviceInstanceId = uuidv4() as ServiceInstanceId;
    await TestHelper.serviceInstance.create({
      id: serviceInstanceId,
      name: 'domain-test-instance',
    });
  });

  describe(`should test createSubscription`, () => {
    it('should create a subscription and return it', async () => {
      const id = uuidv4() as SubscriptionId;
      const start_date = new Date('2025-01-01');
      const end_date = new Date('2026-01-01');

      const result = await SubscriptionDomain.createSubscription({
        id,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: serviceInstanceId,
        start_date,
        end_date,
      });

      expect(result).toMatchObject({
        id,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: serviceInstanceId,
      });
      expect(result.start_date?.toISOString().slice(0, 10)).toBe('2025-01-01');
      expect(result.end_date?.toISOString().slice(0, 10)).toBe('2026-01-01');
    });

    it('should create a subscription with a null end_date', async () => {
      const id = uuidv4() as SubscriptionId;

      const result = await SubscriptionDomain.createSubscription({
        id,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: serviceInstanceId,
        start_date: new Date(),
        end_date: null,
      });

      expect(result.id).toBe(id);
      expect(result.end_date).toBeNull();
    });
  });

  describe(`should test loadSubscriptionBy`, () => {
    it('should return the subscription matching the given field', async () => {
      const id = uuidv4() as SubscriptionId;
      await SubscriptionDomain.createSubscription({
        id,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: serviceInstanceId,
        start_date: new Date(),
        end_date: null,
      });

      const result = await SubscriptionDomain.loadSubscriptionBy({ id });

      expect(result).toBeDefined();
      expect(result?.id).toBe(id);
    });

    it('should return undefined when no subscription matches', async () => {
      const result = await SubscriptionDomain.loadSubscriptionBy({
        id: uuidv4() as SubscriptionId,
      });

      expect(result).toBeUndefined();
    });

    it('should filter by organization_id', async () => {
      const id = uuidv4() as SubscriptionId;
      await SubscriptionDomain.createSubscription({
        id,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        service_instance_id: serviceInstanceId,
        start_date: new Date(),
        end_date: null,
      });

      const result = await SubscriptionDomain.loadSubscriptionBy({
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        service_instance_id: serviceInstanceId,
      });

      expect(result?.id).toBe(id);
    });
  });

  describe(`should test updateSubscriptionBy`, () => {
    it('should update the subscription fields and return the updated rows', async () => {
      const id = uuidv4() as SubscriptionId;
      await SubscriptionDomain.createSubscription({
        id,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: serviceInstanceId,
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-12-31'),
      });

      const [updated] = await SubscriptionDomain.updateSubscriptionBy(
        { id },
        { start_date: new Date('2026-06-01'), end_date: new Date('2026-12-31') }
      );

      expect(updated).toBeDefined();
      expect(updated?.start_date?.toISOString().slice(0, 10)).toBe(
        '2026-06-01'
      );
      expect(updated?.end_date?.toISOString().slice(0, 10)).toBe('2026-12-31');
    });
  });

  describe(`SubscriptionDomain.${SubscriptionDomain.deleteSubscriptions.name}`, () => {
    it('should delete subscriptions by ids and return the deleted rows', async () => {
      const id1 = uuidv4() as SubscriptionId;
      const id2 = uuidv4() as SubscriptionId;
      await SubscriptionDomain.createSubscription({
        id: id1,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: serviceInstanceId,
        start_date: new Date(),
        end_date: null,
      });
      await SubscriptionDomain.createSubscription({
        id: id2,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        service_instance_id: serviceInstanceId,
        start_date: new Date(),
        end_date: null,
      });

      const deleted = await SubscriptionDomain.deleteSubscriptions([id1, id2]);

      expect(deleted).toHaveLength(2);
      expect(deleted?.map((s) => s.id)).toEqual(
        expect.arrayContaining([id1, id2])
      );

      const remaining1 = await SubscriptionDomain.loadSubscriptionBy({
        id: id1,
      });
      const remaining2 = await SubscriptionDomain.loadSubscriptionBy({
        id: id2,
      });
      expect(remaining1).toBeUndefined();
      expect(remaining2).toBeUndefined();
    });

    it('should return an empty array when no ids match', async () => {
      const deleted = await SubscriptionDomain.deleteSubscriptions([
        uuidv4() as SubscriptionId,
      ]);
      expect(deleted).toEqual([]);
    });
  });

  describe('should test loadSubscriptionCapabilitiesBySubscriptionIds', () => {
    it('should return capabilities linked to the given subscriptions', async () => {
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
        SERVICES.INSTANCES.INTEGRATIONS.CAPABILITIES.DELETE.ID,
      ]);

      const result =
        await SubscriptionDomain.loadSubscriptionCapabilitiesBySubscriptionIds([
          id,
        ]);

      expect(result).toHaveLength(2);
      const capabilityIds = result.map(
        (subscriptionCapability: {
          service_capability_id: ServiceCapabilityId;
        }) => subscriptionCapability.service_capability_id
      );
      expect(capabilityIds).toEqual(
        expect.arrayContaining([
          SERVICES.INSTANCES.INTEGRATIONS.CAPABILITIES.UPLOAD.ID,
          SERVICES.INSTANCES.INTEGRATIONS.CAPABILITIES.DELETE.ID,
        ])
      );
    });

    it('should return an empty array when the subscription has no capabilities', async () => {
      const id = uuidv4() as SubscriptionId;
      await SubscriptionDomain.createSubscription({
        id,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: serviceInstanceId,
        start_date: new Date(),
        end_date: null,
      });

      const result =
        await SubscriptionDomain.loadSubscriptionCapabilitiesBySubscriptionIds([
          id,
        ]);
      expect(result).toHaveLength(0);
    });

    it('should return an empty array when given no ids', async () => {
      const result =
        await SubscriptionDomain.loadSubscriptionCapabilitiesBySubscriptionIds(
          []
        );
      expect(result).toEqual([]);
    });
  });

  describe('should test loadServiceCapabilitiesBySubscriptionCapabilityIds', () => {
    it('should return the service capability linked to a subscription_capability id', async () => {
      const subscriptionId = uuidv4() as SubscriptionId;
      await SubscriptionDomain.createSubscription({
        id: subscriptionId,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
        start_date: new Date(),
        end_date: null,
      });
      const [subscriptionCapability] =
        await SubscriptionCapabilityDomain.addCapabilitiesToSubscription(
          subscriptionId,
          [SERVICES.INSTANCES.INTEGRATIONS.CAPABILITIES.UPLOAD.ID]
        );

      const result =
        await SubscriptionDomain.loadServiceCapabilitiesBySubscriptionCapabilityIds(
          [subscriptionCapability!.id]
        );

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(
        SERVICES.INSTANCES.INTEGRATIONS.CAPABILITIES.UPLOAD.ID
      );
      expect(result[0]!.subscription_capability_id).toBe(
        subscriptionCapability!.id
      );
    });

    it('should return an empty array when the subscription_capability id does not exist', async () => {
      const result =
        await SubscriptionDomain.loadServiceCapabilitiesBySubscriptionCapabilityIds(
          [uuidv4() as SubscriptionCapabilityId]
        );
      expect(result).toEqual([]);
    });

    it('should return an empty array when given no ids', async () => {
      const result =
        await SubscriptionDomain.loadServiceCapabilitiesBySubscriptionCapabilityIds(
          []
        );
      expect(result).toEqual([]);
    });
  });

  describe(`should test loadSubscriptionsByOrganizationAndServiceInstanceIds`, () => {
    let otherServiceInstanceId: ServiceInstanceId;
    let filigranOnFirstInstance: SubscriptionId;
    let filigranOnOtherInstance: SubscriptionId;
    let secondOrgaOnFirstInstance: SubscriptionId;
    let secondOrgaOnOtherInstance: SubscriptionId;

    const createSubscription = async (
      organizationId: OrganizationId,
      instanceId: ServiceInstanceId
    ): Promise<SubscriptionId> => {
      const id = uuidv4() as SubscriptionId;
      await SubscriptionDomain.createSubscription({
        id,
        organization_id: organizationId,
        service_instance_id: instanceId,
        start_date: new Date(),
        end_date: null,
      });
      return id;
    };

    beforeEach(async () => {
      otherServiceInstanceId = uuidv4() as ServiceInstanceId;
      await TestHelper.serviceInstance.create({
        id: otherServiceInstanceId,
        name: 'domain-test-other-instance',
      });

      filigranOnFirstInstance = await createSubscription(
        TEST_ORGANIZATIONS.FILIGRAN.ID,
        serviceInstanceId
      );
      filigranOnOtherInstance = await createSubscription(
        TEST_ORGANIZATIONS.FILIGRAN.ID,
        otherServiceInstanceId
      );
      secondOrgaOnFirstInstance = await createSubscription(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        serviceInstanceId
      );
      secondOrgaOnOtherInstance = await createSubscription(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        otherServiceInstanceId
      );
    });

    it('should return the subscription matching both the organization and the service instance', async () => {
      const result =
        await SubscriptionDomain.loadSubscriptionsByOrganizationAndServiceInstanceIds(
          {
            organizationIds: [TEST_ORGANIZATIONS.FILIGRAN.ID],
            serviceInstanceIds: [serviceInstanceId],
          }
        );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: filigranOnFirstInstance,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: serviceInstanceId,
      });
    });

    it('should return every combination when several organizations and service instances are given', async () => {
      const result =
        await SubscriptionDomain.loadSubscriptionsByOrganizationAndServiceInstanceIds(
          {
            organizationIds: [
              TEST_ORGANIZATIONS.FILIGRAN.ID,
              TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
            ],
            serviceInstanceIds: [serviceInstanceId, otherServiceInstanceId],
          }
        );

      expect(result.map(({ id }) => id)).toEqual(
        expect.arrayContaining([
          filigranOnFirstInstance,
          filigranOnOtherInstance,
          secondOrgaOnFirstInstance,
          secondOrgaOnOtherInstance,
        ])
      );
    });

    it('should not return subscriptions of an organization that is not requested', async () => {
      const result =
        await SubscriptionDomain.loadSubscriptionsByOrganizationAndServiceInstanceIds(
          {
            organizationIds: [TEST_ORGANIZATIONS.FILIGRAN.ID],
            serviceInstanceIds: [serviceInstanceId, otherServiceInstanceId],
          }
        );

      expect(result.map(({ id }) => id)).toEqual(
        expect.arrayContaining([
          filigranOnFirstInstance,
          filigranOnOtherInstance,
        ])
      );
      expect(result.map(({ id }) => id)).not.toEqual(
        expect.arrayContaining([
          secondOrgaOnFirstInstance,
          secondOrgaOnOtherInstance,
        ])
      );
    });

    it('should not return subscriptions of a service instance that is not requested', async () => {
      const result =
        await SubscriptionDomain.loadSubscriptionsByOrganizationAndServiceInstanceIds(
          {
            organizationIds: [
              TEST_ORGANIZATIONS.FILIGRAN.ID,
              TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
            ],
            serviceInstanceIds: [otherServiceInstanceId],
          }
        );

      expect(result.map(({ id }) => id).sort()).toEqual(
        [filigranOnOtherInstance, secondOrgaOnOtherInstance].sort()
      );
    });

    it('should return an empty array when the organization has no subscription on the given service instance', async () => {
      const instanceWithoutSubscription = uuidv4() as ServiceInstanceId;
      await TestHelper.serviceInstance.create({
        id: instanceWithoutSubscription,
        name: 'domain-test-unused-instance',
      });

      const result =
        await SubscriptionDomain.loadSubscriptionsByOrganizationAndServiceInstanceIds(
          {
            organizationIds: [TEST_ORGANIZATIONS.FILIGRAN.ID],
            serviceInstanceIds: [instanceWithoutSubscription],
          }
        );

      expect(result).toEqual([]);
    });

    it('should return an empty array when the organization does not exist', async () => {
      const result =
        await SubscriptionDomain.loadSubscriptionsByOrganizationAndServiceInstanceIds(
          {
            organizationIds: [uuidv4() as OrganizationId],
            serviceInstanceIds: [serviceInstanceId],
          }
        );

      expect(result).toEqual([]);
    });

    it.each`
      hasOrganizationIds | hasServiceInstanceIds | description
      ${false}           | ${true}               | ${'no organization id'}
      ${true}            | ${false}              | ${'no service instance id'}
      ${false}           | ${false}              | ${'neither organization nor service instance id'}
    `(
      'should return an empty array when $description is given',
      async ({ hasOrganizationIds, hasServiceInstanceIds }) => {
        const result =
          await SubscriptionDomain.loadSubscriptionsByOrganizationAndServiceInstanceIds(
            {
              organizationIds: hasOrganizationIds
                ? [TEST_ORGANIZATIONS.FILIGRAN.ID]
                : [],
              serviceInstanceIds: hasServiceInstanceIds
                ? [serviceInstanceId]
                : [],
            }
          );

        expect(result).toEqual([]);
      }
    );
  });

  describe(`should test transferSubscriptionToOrganization`, () => {
    it('should transfer a subscription to a new organization', async () => {
      const id = uuidv4() as SubscriptionId;
      await SubscriptionDomain.createSubscription({
        id,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: serviceInstanceId,
        start_date: new Date(),
        end_date: null,
      });

      await SubscriptionDomain.transferSubscriptionToOrganization({
        subscriptionId: id,
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      });

      const updated = await SubscriptionDomain.loadSubscriptionBy({ id });
      expect(updated?.organization_id).toBe(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
      );
    });
  });
});
