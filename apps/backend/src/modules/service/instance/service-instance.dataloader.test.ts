import { afterEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import {
  // eslint-disable-next-line no-restricted-imports
  requestContextAdminUser,
  requestContextSimpleUserSecondOrga,
  SERVICES,
  TEST_ORGANIZATIONS,
} from '../../../../tests/tests.const';
import { requestContext } from '../../../context/request.context';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import { ServiceInstanceDataLoader } from './service-instance.dataloader';
import { organizationServiceInstanceKey } from './service-instance.keys';

describe('batchLoadSubscriptions', () => {
  afterEach(async () => {
    await TestHelper.subscription.delete({});
  });

  const secondOrganizationKey = organizationServiceInstanceKey.create({
    organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
    serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
  });

  const createSubscriptions = async () => {
    await TestHelper.subscription.create({
      organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
    });
    await TestHelper.subscription.create({
      organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
      service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
    });
  };

  it('should return every organization subscription for a platform admin', async () => {
    // Given
    await createSubscriptions();
    requestContext.set(requestContextAdminUser);

    // When
    const [subscriptions] =
      await ServiceInstanceDataLoader.batchLoadSubscriptions([
        secondOrganizationKey,
      ]);

    // Then
    expect(subscriptions).toHaveLength(2);
    expect(
      subscriptions?.map((subscription) => subscription.organization_id).sort()
    ).toEqual(
      [
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        TEST_ORGANIZATIONS.FILIGRAN.ID,
      ].sort()
    );
  });

  it('should only return the subscriptions of the organization carried by the key for a regular user', async () => {
    // Given
    await createSubscriptions();
    requestContext.set(requestContextSimpleUserSecondOrga);

    // When
    const [subscriptions] =
      await ServiceInstanceDataLoader.batchLoadSubscriptions([
        secondOrganizationKey,
      ]);

    // Then
    expect(subscriptions).toHaveLength(1);
    expect(subscriptions?.[0]).toMatchObject({
      organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
    });
  });

  it('should return an empty array when the key targets an organization without subscription', async () => {
    // Given
    await createSubscriptions();
    requestContext.set(requestContextSimpleUserSecondOrga);

    // When
    const [subscriptions] =
      await ServiceInstanceDataLoader.batchLoadSubscriptions([
        organizationServiceInstanceKey.create({
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          serviceInstanceId: SERVICES.INSTANCES.OPENAEV_SCENARIOS.ID,
        }),
      ]);

    // Then
    expect(subscriptions).toEqual([]);
  });
});

describe('batchLoadServiceInstances', () => {
  it('should return the matching service instances in the order of the requested ids', async () => {
    // When
    const [integrations, vault] =
      await ServiceInstanceDataLoader.batchLoadServiceInstances([
        SERVICES.INSTANCES.INTEGRATIONS.ID,
        SERVICES.INSTANCES.VAULT.ID,
      ]);

    // Then
    expect(integrations).toMatchObject({
      id: SERVICES.INSTANCES.INTEGRATIONS.ID,
    });
    expect(vault).toMatchObject({ id: SERVICES.INSTANCES.VAULT.ID });
  });

  it('should return undefined for an id that does not match a service instance', async () => {
    // When
    const [serviceInstance] =
      await ServiceInstanceDataLoader.batchLoadServiceInstances([
        'ffffffff-ffff-ffff-ffff-ffffffffffff' as ServiceInstanceId,
      ]);

    // Then
    expect(serviceInstance).toBeUndefined();
  });

  it('should return an empty array when no ids are requested', async () => {
    // When
    const result = await ServiceInstanceDataLoader.batchLoadServiceInstances(
      []
    );

    // Then
    expect(result).toEqual([]);
  });
});
