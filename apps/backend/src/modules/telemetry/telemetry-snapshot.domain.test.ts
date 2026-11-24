import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import { SERVICES } from '../../../tests/tests.const';
import {
  PlatformConfigurationStatus,
  PlatformContract,
  ServiceDefinitionIdentifier,
} from '../../__generated__/resolvers-types';
import { ServiceDefinitionId } from '../../model/kanel/public/ServiceDefinition';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { GAUGES } from './telemetry-snapshot.domain';
import { TelemetryTargetProduct } from './telemetry.const';

const REGISTERED_PLATFORMS_GAUGE = 'xtm_hub_registered_platforms_by_identity';

const collectRegisteredPlatforms = async () => {
  const gauge = GAUGES.find(({ name }) => name === REGISTERED_PLATFORMS_GAUGE);
  if (!gauge) {
    throw new Error(`Gauge ${REGISTERED_PLATFORMS_GAUGE} is not registered`);
  }
  return gauge.collect();
};

const loadXtmOneDefinitionId = async (): Promise<ServiceDefinitionId> => {
  const definition = await TestHelper.serviceDefinition.load({
    identifier: ServiceDefinitionIdentifier.XtmoneRegistration,
  });
  if (!definition) {
    throw new Error(
      `ServiceDefinition ${ServiceDefinitionIdentifier.XtmoneRegistration} is missing from the test database (is it migrated?)`
    );
  }
  return definition.id;
};

describe('xtm_hub_registered_platforms_by_identity gauge', () => {
  const createdServiceInstanceIds: ServiceInstanceId[] = [];
  let xtmOneDefinitionId: ServiceDefinitionId;

  const registerPlatform = async (
    serviceDefinitionId: ServiceDefinitionId,
    overrides: {
      status?: PlatformConfigurationStatus;
      contract?: PlatformContract;
    } = {}
  ) => {
    const serviceInstance = await TestHelper.serviceInstance.create({
      service_definition_id: serviceDefinitionId,
    });
    createdServiceInstanceIds.push(serviceInstance.id);
    await TestHelper.platformConfiguration.create({
      service_instance_id: serviceInstance.id,
      status: overrides.status ?? PlatformConfigurationStatus.Active,
      platform_contract: overrides.contract ?? PlatformContract.Ee,
    });
  };

  beforeAll(async () => {
    xtmOneDefinitionId = await loadXtmOneDefinitionId();
  });

  beforeEach(async () => {
    await TestHelper.platformConfiguration.delete({});
  });

  afterEach(async () => {
    await TestHelper.platformConfiguration.delete({});
    for (const id of createdServiceInstanceIds.splice(0)) {
      await TestHelper.serviceInstance.delete({ id });
    }
  });

  it('should return no series when no platform is registered', async () => {
    const observations = await collectRegisteredPlatforms();

    expect(observations).toEqual([]);
  });

  it('should count an XTM One registration under the xtmone product', async () => {
    await registerPlatform(xtmOneDefinitionId);

    const observations = await collectRegisteredPlatforms();

    expect(observations).toEqual([
      {
        value: 1,
        attributes: {
          product: TelemetryTargetProduct.XTM_ONE,
          contract: PlatformContract.Ee,
          status: PlatformConfigurationStatus.Active,
        },
      },
    ]);
  });

  it('should break registrations down by product, contract and status', async () => {
    await registerPlatform(SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID);
    await registerPlatform(SERVICES.DEFINITIONS.OPENAEV_REGISTRATION.ID, {
      contract: PlatformContract.Ce,
    });
    await registerPlatform(xtmOneDefinitionId);
    await registerPlatform(xtmOneDefinitionId);
    await registerPlatform(xtmOneDefinitionId, {
      status: PlatformConfigurationStatus.Inactive,
    });

    const observations = await collectRegisteredPlatforms();

    expect(observations).toHaveLength(4);
    expect(observations).toEqual(
      expect.arrayContaining([
        {
          value: 1,
          attributes: {
            product: TelemetryTargetProduct.OPEN_CTI,
            contract: PlatformContract.Ee,
            status: PlatformConfigurationStatus.Active,
          },
        },
        {
          value: 1,
          attributes: {
            product: TelemetryTargetProduct.OPEN_AEV,
            contract: PlatformContract.Ce,
            status: PlatformConfigurationStatus.Active,
          },
        },
        {
          value: 2,
          attributes: {
            product: TelemetryTargetProduct.XTM_ONE,
            contract: PlatformContract.Ee,
            status: PlatformConfigurationStatus.Active,
          },
        },
        {
          value: 1,
          attributes: {
            product: TelemetryTargetProduct.XTM_ONE,
            contract: PlatformContract.Ee,
            status: PlatformConfigurationStatus.Inactive,
          },
        },
      ])
    );
  });
});
