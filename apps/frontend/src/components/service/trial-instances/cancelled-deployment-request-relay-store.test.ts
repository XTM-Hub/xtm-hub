import {
  DeploymentRequestDeploymentType,
  DeploymentRequestHubStatus,
  DeploymentRequestPlatformRegion,
  PlatformIdentifier,
  type TrialsCancelDeploymentRequestMutation,
} from '@graphql/generated';
import {
  Environment,
  Network,
  RecordSource,
  Store,
  type RecordMap,
} from 'relay-runtime';
import { describe, expect, it } from 'vitest';
import { syncCancelledDeploymentRequestToRelayStore } from './cancelled-deployment-request-relay-store';

const DEPLOYMENT_REQUEST_ID = 'deployment-request-id';

const buildEnvironment = (records: RecordMap = {}) =>
  new Environment({
    network: Network.create(() => {
      throw new Error('No network call expected');
    }),
    store: new Store(new RecordSource(records)),
  });

const activeDeploymentRequestRecord = {
  __id: DEPLOYMENT_REQUEST_ID,
  __typename: 'DeploymentRequest',
  id: DEPLOYMENT_REQUEST_ID,
  hub_status: DeploymentRequestHubStatus.Active,
  region: DeploymentRequestPlatformRegion.EuWest,
  type: DeploymentRequestDeploymentType.Bundle,
  platform_identifier: PlatformIdentifier.Opencti,
  counts_in_orga_quota: true,
  requester_email: 'user@filigran.io',
};

const cancelledDeploymentRequest: NonNullable<
  TrialsCancelDeploymentRequestMutation['cancelDeploymentRequest']
> = {
  id: DEPLOYMENT_REQUEST_ID,
  region: DeploymentRequestPlatformRegion.EuWest,
  type: DeploymentRequestDeploymentType.Bundle,
  platform_identifier: PlatformIdentifier.Opencti,
  hub_status: DeploymentRequestHubStatus.Cancelled,
  counts_in_orga_quota: false,
};

describe('syncCancelledDeploymentRequestToRelayStore', () => {
  it('should write the cancelled deployment request fields into the Relay store by id', () => {
    // Given
    const environment = buildEnvironment({
      [DEPLOYMENT_REQUEST_ID]: activeDeploymentRequestRecord,
    });

    // When
    syncCancelledDeploymentRequestToRelayStore(
      environment,
      cancelledDeploymentRequest
    );

    // Then
    const record = environment
      .getStore()
      .getSource()
      .get(DEPLOYMENT_REQUEST_ID);
    expect(record).toMatchObject({
      hub_status: DeploymentRequestHubStatus.Cancelled,
      counts_in_orga_quota: false,
      requester_email: 'user@filigran.io',
    });
  });

  it('should not create a record when the deployment request is not in the Relay store', () => {
    // Given
    const environment = buildEnvironment();

    // When
    syncCancelledDeploymentRequestToRelayStore(
      environment,
      cancelledDeploymentRequest
    );

    // Then
    expect(
      environment.getStore().getSource().get(DEPLOYMENT_REQUEST_ID)
    ).toBeUndefined();
  });

  it('should do nothing when the mutation returns no deployment request', () => {
    // Given
    const environment = buildEnvironment({
      [DEPLOYMENT_REQUEST_ID]: activeDeploymentRequestRecord,
    });

    // When
    syncCancelledDeploymentRequestToRelayStore(environment, null);

    // Then
    expect(
      environment.getStore().getSource().get(DEPLOYMENT_REQUEST_ID)
    ).toMatchObject({ hub_status: DeploymentRequestHubStatus.Active });
  });
});
