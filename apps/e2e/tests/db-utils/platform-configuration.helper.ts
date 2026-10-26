import { db } from './db-connection';

// Set by XTM Hub each time a platform checks its connectivity with XTM Hub.
export const getLastConnectivityCheck = async (
  platformUrl: string
): Promise<number | null> => {
  const configuration = await db('PlatformConfiguration')
    .where('platform_url', 'like', `${platformUrl}%`)
    .first();
  return configuration?.last_connectivity_check
    ? new Date(configuration.last_connectivity_check).getTime()
    : null;
};
