import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  requestContextRegistererUserSecondOrga,
  SERVICES,
  TEST_ORGANIZATIONS,
} from '../../../tests/tests.const';
import {
  PlatformContract,
  PlatformIdentifier,
} from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';
import { PlatformConfigurationDomain } from './platform-configuration/platform-configuration.domain';
import { RegistrationDataLoader } from './registration.dataloader';
import { RegistrationDomain } from './registration.domain';

describe('batchLoadRegisteredPlatforms', () => {
  const openCTIPlatformId = uuidv4();
  const openCTIPlatformTitle = 'My OpenCTI platform';
  const openAEVPlatformId = uuidv4();
  const openAEVPlatformTitle = 'My OpenAEV platform';

  let openCTIServiceInstanceId: ServiceInstanceId;
  let openAEVServiceInstanceId: ServiceInstanceId;

  beforeEach(async () => {
    requestContext.set(requestContextRegistererUserSecondOrga);

    openCTIServiceInstanceId = await RegistrationDomain.registerNewPlatform({
      organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      serviceDefinitionId: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
      configuration: {
        registerer_id:
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
        platform_id: openCTIPlatformId,
        platform_url: 'http://opencti.example.com',
        platform_title: openCTIPlatformTitle,
        platform_contract: PlatformContract.Ee,
        platform_version: '6.7.17',
        token: uuidv4(),
        last_connectivity_check: new Date(),
      },
      platformIdentifier: PlatformIdentifier.Opencti,
    });

    openAEVServiceInstanceId = await RegistrationDomain.registerNewPlatform({
      organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      serviceDefinitionId: SERVICES.DEFINITIONS.OPENAEV_REGISTRATION.ID,
      configuration: {
        registerer_id:
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
        platform_id: openAEVPlatformId,
        platform_url: 'http://openaev.example.com',
        platform_title: openAEVPlatformTitle,
        platform_contract: PlatformContract.Ee,
        platform_version: '1.0.0',
        token: uuidv4(),
        last_connectivity_check: new Date(),
      },
      platformIdentifier: PlatformIdentifier.Openaev,
    });
  });

  afterEach(async () => {
    await TestHelper.deploymentRequest.delete({});
    await PlatformConfigurationDomain.deleteConfigurationBy({});
    await ServiceInstanceDomain.deleteServiceInstanceBy({});
  });

  it('should return the registered platform matching each requested service instance id, in order', async () => {
    // When
    const [openAEVPlatform, openCTIPlatform] =
      await RegistrationDataLoader.batchLoadRegisteredPlatforms([
        openAEVServiceInstanceId,
        openCTIServiceInstanceId,
      ]);

    // Then
    expect(openAEVPlatform).toMatchObject({
      id: openAEVServiceInstanceId,
      platform_id: openAEVPlatformId,
      title: openAEVPlatformTitle,
    });
    expect(openCTIPlatform).toMatchObject({
      id: openCTIServiceInstanceId,
      platform_id: openCTIPlatformId,
      title: openCTIPlatformTitle,
    });
  });

  it('should return null for a service instance id that does not match any registered platform', async () => {
    // When
    const [registeredPlatform] =
      await RegistrationDataLoader.batchLoadRegisteredPlatforms([
        uuidv4() as ServiceInstanceId,
      ]);

    // Then
    expect(registeredPlatform).toBeNull();
  });

  it('should return an empty array when no ids are requested', async () => {
    // When
    const result = await RegistrationDataLoader.batchLoadRegisteredPlatforms(
      []
    );

    // Then
    expect(result).toEqual([]);
  });
});
