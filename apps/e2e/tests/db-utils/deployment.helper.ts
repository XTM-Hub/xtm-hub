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

const DAY_IN_MS = 24 * 60 * 60 * 1000;

interface BundleFamilyUpdate {
  hub_status: string;
  target_state: string;
  actual_state: string;
  start_date: Date;
  end_date: Date;
}

const updateBundleFamily = async (
  organizationId: string,
  update: BundleFamilyUpdate
) => {
  const bundle = await loadBundleDeploymentRequest(organizationId);
  const { start_date: startDate, end_date: endDate } = update;

  const products = await loadBundleProducts(bundle.id);
  for (const product of products) {
    await db('DeploymentRequest')
      .where({ id: product.id })
      .update({
        ...update,
        platform_id: `${product.platform_identifier}-platform-id`,
        url: `https://${product.platform_identifier}.example.test`,
      });
    await db('Subscription')
      .where({ service_instance_id: product.service_instance_id })
      .update({ start_date: startDate, end_date: endDate });
  }

  await db('DeploymentRequest').where({ id: bundle.id }).update(update);
  await db('Subscription')
    .where({ service_instance_id: bundle.service_instance_id })
    .update({ start_date: startDate, end_date: endDate });

  return bundle;
};

export const activateBundleDeploymentRequest = async (
  organizationId: string
) => {
  const startDate = new Date();

  return updateBundleFamily(organizationId, {
    hub_status: 'active',
    target_state: 'active',
    actual_state: 'active',
    start_date: startDate,
    end_date: new Date(
      startDate.getTime() + TRIAL_DURATION_IN_DAYS * DAY_IN_MS
    ),
  });
};

export const expireBundleDeploymentRequest = async (organizationId: string) => {
  const endDate = new Date(Date.now() - DAY_IN_MS);

  return updateBundleFamily(organizationId, {
    hub_status: 'expired',
    target_state: 'removed',
    actual_state: 'removed',
    start_date: new Date(
      endDate.getTime() - TRIAL_DURATION_IN_DAYS * DAY_IN_MS
    ),
    end_date: endDate,
  });
};
