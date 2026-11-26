import { db } from './db-connection';

const findPlatformConfiguration = (platformUrl: string) =>
  db('PlatformConfiguration').where('platform_url', 'like', `${platformUrl}%`);

// Set by XTM Hub each time a platform checks its connectivity with XTM Hub.
export const getLastConnectivityCheck = async (
  platformUrl: string
): Promise<number | null> => {
  const configuration = await findPlatformConfiguration(platformUrl).first();
  return configuration?.last_connectivity_check
    ? new Date(configuration.last_connectivity_check).getTime()
    : null;
};

// The service instance of the platform's registration, as XTM Hub puts it in its urls: its Relay global id.
export const getServiceInstanceGlobalId = async (
  platformUrl: string
): Promise<string> => {
  const configuration = await findPlatformConfiguration(platformUrl).first();
  if (!configuration) {
    throw new Error(`No registration for the platform ${platformUrl}`);
  }
  return btoa(`ServiceInstance:${configuration.service_instance_id}`);
};

// XTM Hub returns this commercial model to each connectivity check of the platform. It comes from the SaaS Manager,
// which the e2e stack cannot reach: a test sets it to make the platform run in the Filigran cloud.
export const setCommercialModel = async (
  platformUrl: string,
  commercialModel: 'SAAS' | 'OTHER'
) => {
  await findPlatformConfiguration(platformUrl).update({
    commercial_model: commercialModel,
  });
};

export type PlatformRegistration = {
  status: string;
  token: string | null;
  organizationName: string;
};

// The registration of a platform as the Hub stores it: its status, its token and the organization that owns it (the
// one of its subscription).
export const getPlatformRegistration = async (
  platformId: string
): Promise<PlatformRegistration> => {
  const registration = await db('PlatformConfiguration')
    .join(
      'Subscription',
      'Subscription.service_instance_id',
      'PlatformConfiguration.service_instance_id'
    )
    .join('Organization', 'Organization.id', 'Subscription.organization_id')
    .where('PlatformConfiguration.platform_id', '=', platformId)
    .select(
      'PlatformConfiguration.status',
      'PlatformConfiguration.token',
      'Organization.name as organizationName'
    )
    .first();
  if (!registration) {
    throw new Error(`No registration for the platform ${platformId}`);
  }
  return registration;
};
