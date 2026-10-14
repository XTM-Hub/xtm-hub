import { registeredPlatformByServiceInstanceId_fragment$data } from '@generated/registeredPlatformByServiceInstanceId_fragment.graphql';
import {
  DeploymentRequestHubStatus,
  PlatformContract,
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
} from '@graphql/generated';

export const basePlatform: registeredPlatformByServiceInstanceId_fragment$data =
  {
    ' $fragmentType': 'registeredPlatformByServiceInstanceId_fragment',
    id: 'platform-id',
    service_instance_id: 'service-instance-id',
    platform_id: 'pid',
    myGroups: null,
    tenant_id: null,
    title: 'My Platform',
    url: 'https://platform.example.com',
    version: '6.7.0',
    identifier: ServiceDefinitionIdentifier.OpenctiRegistration,
    contract: PlatformContract.Ee,
    deployment_request: null,
    last_connectivity_check: null,
    commercial_model: null,
    subscription: {
      start_date: '2025-01-01',
      end_date: null,
      service_instance: { id: 'service-instance-id' },
      organization: { id: 'org-id' },
    },
  };

export const trialPlatform: registeredPlatformByServiceInstanceId_fragment$data =
  {
    ...basePlatform,
    contract: PlatformContract.Trial,
    deployment_request: {
      id: 'dr-id',
      hub_status: DeploymentRequestHubStatus.Active,
      region: 'eu_west',
      platform_identifier: PlatformIdentifier.Opencti,
      counts_in_orga_quota: true,
      requester_email: 'trial-admin@filigran.io',
    },
    subscription: {
      ...basePlatform.subscription!,
      end_date: '2025-04-01',
    },
  };

export const trialPlatformWithAccess: registeredPlatformByServiceInstanceId_fragment$data =
  {
    ...trialPlatform,
    myGroups: [{ name: 'Admin' }],
  };
