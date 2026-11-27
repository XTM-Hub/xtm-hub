import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  requestContextRegistererUserSecondOrga,
  TEST_ORGANIZATIONS,
} from '../../../tests/tests.const';
import { requestContext } from '../../context/request.context';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { ServiceInstanceDomain } from '../../modules/service/instance/service-instance.domain';

describe('restrictServiceInstanceToAccessible', () => {
  let publicInstanceId: ServiceInstanceId;
  let hiddenSubscribedBySecondId: ServiceInstanceId;
  let hiddenUnsubscribedId: ServiceInstanceId;

  const givenScene = async (
    options: Parameters<typeof TestHelper.serviceInstanceScene.create>[0]
  ) =>
    (await TestHelper.serviceInstanceScene.create(options)).serviceInstance.id;

  const isAccessible = async (id: ServiceInstanceId) =>
    (await ServiceInstanceDomain.loadAccessibleServiceInstanceBy({ id })) !==
    undefined;

  beforeAll(async () => {
    publicInstanceId = await givenScene({ isPublic: true });
    hiddenSubscribedBySecondId = await givenScene({
      isPublic: false,
      subscribedBy: [TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID],
    });
    hiddenUnsubscribedId = await givenScene({ isPublic: false });
  });

  afterAll(async () => {
    await TestHelper.serviceInstanceScene.cleanupAll();
  });

  it('should keep a public service instance accessible to an organization that does not subscribe to it', async () => {
    // Given
    requestContext.set(requestContextRegistererUserSecondOrga);

    // When
    const result = await isAccessible(publicInstanceId);

    // Then
    expect(result).toBe(true);
  });

  it('should keep a non public service instance accessible to the organization that subscribes to it', async () => {
    // Given
    requestContext.set(requestContextRegistererUserSecondOrga);

    // When
    const result = await isAccessible(hiddenSubscribedBySecondId);

    // Then
    expect(result).toBe(true);
  });

  it('should not make a non public service instance accessible to an organization that does not subscribe to it', async () => {
    // Given
    requestContext.set(requestContextRegistererUserSecondOrga);

    // When
    const result = await isAccessible(hiddenUnsubscribedId);

    // Then
    expect(result).toBe(false);
  });

  it('should make only the public service instances accessible when the request has no user', async () => {
    // Given
    requestContext.set({});

    // When
    const results = [
      await isAccessible(publicInstanceId),
      await isAccessible(hiddenSubscribedBySecondId),
    ];

    // Then
    expect(results).toEqual([true, false]);
  });
});
