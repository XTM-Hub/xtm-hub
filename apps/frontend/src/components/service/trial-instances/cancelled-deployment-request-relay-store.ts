import type { TrialsCancelDeploymentRequestMutation } from '@graphql/generated';
import { commitLocalUpdate, type IEnvironment } from 'relay-runtime';

type CancelledDeploymentRequest = NonNullable<
  TrialsCancelDeploymentRequestMutation['cancelDeploymentRequest']
>;

const SYNCED_FIELDS = [
  'region',
  'type',
  'platform_identifier',
  'hub_status',
  'counts_in_orga_quota',
] as const satisfies readonly (keyof CancelledDeploymentRequest)[];

/**
 * The registration pages still read `deployment_request` through Relay
 * fragments, and the Relay store outlives client-side navigation. Cancelling
 * through react-query no longer normalizes the response into that store, so the
 * record is updated by id here, as the former Relay mutation did. Without it,
 * going back to a registration page renders the stale status and keeps the
 * cancel action available.
 */
export const syncCancelledDeploymentRequestToRelayStore = (
  environment: IEnvironment,
  deploymentRequest: CancelledDeploymentRequest | null | undefined
) => {
  if (!deploymentRequest) {
    return;
  }

  commitLocalUpdate(environment, (store) => {
    const record = store.get(deploymentRequest.id);
    if (!record) {
      return;
    }
    SYNCED_FIELDS.forEach((field) => {
      record.setValue(deploymentRequest[field] ?? null, field);
    });
  });
};
