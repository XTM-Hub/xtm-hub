import { db } from './db-connection';
import {
  addServiceInstance,
  loadServiceDefinitionIdByIdentifier,
} from './service.helper';
import { v4 as uuidv4 } from 'uuid';
import { addSubscription } from './subscription.helper';

export const insertDeploymentRequest = async (
  deploymentRequestData: Record<string, unknown>
) => {
  const [serviceDefinition] = await loadServiceDefinitionIdByIdentifier(
    'opencti_registration'
  );

  const serviceInstanceId = await addServiceInstance(serviceDefinition.id);

  await addSubscription({
    id: uuidv4(),
    organization_id: deploymentRequestData.organization_requester_id,
    service_instance_id: serviceInstanceId,
    start_date: new Date(),
    end_date: null,
  });

  await db('DeploymentRequest')
    .insert({
      service_instance_id: serviceInstanceId,
      ...deploymentRequestData,
    })
    .onConflict('id')
    .ignore();
};

// An organization can only ever have one bundle, a second request is rejected
// with FreeTrialAlreadyExists
export const loadBundleDeploymentRequest = async (organizationId: string) => {
  const bundle = await db('DeploymentRequest')
    .where({ organization_requester_id: organizationId, type: 'bundle' })
    .first();

  if (!bundle) {
    throw new Error(
      `No bundle deployment request found for organization ${organizationId}`
    );
  }

  return bundle;
};

export const loadBundleProducts = async (bundleId: string) =>
  db('DeploymentRequest')
    .where({ parent_id: bundleId })
    .orderBy('platform_identifier');

export const TRIAL_DURATION_IN_DAYS = 30;

export const activateBundleDeploymentRequest = async (
  organizationId: string
) => {
  const bundle = await loadBundleDeploymentRequest(organizationId);
  const startDate = new Date();
  const endDate = new Date(
    startDate.getTime() + TRIAL_DURATION_IN_DAYS * 24 * 60 * 60 * 1000
  );

  const activation = {
    hub_status: 'active',
    target_state: 'active',
    actual_state: 'provisioned',
    start_date: startDate,
    end_date: endDate,
  };

  const products = await loadBundleProducts(bundle.id);
  for (const product of products) {
    await db('DeploymentRequest')
      .where({ id: product.id })
      .update({
        ...activation,
        platform_id: `${product.platform_identifier}-platform-id`,
        url: `https://${product.platform_identifier}.example.test`,
      });
    await db('Subscription')
      .where({ service_instance_id: product.service_instance_id })
      .update({ start_date: startDate, end_date: endDate });
  }

  await db('DeploymentRequest').where({ id: bundle.id }).update(activation);
  await db('Subscription')
    .where({ service_instance_id: bundle.service_instance_id })
    .update({ start_date: startDate, end_date: endDate });

  return bundle;
};
