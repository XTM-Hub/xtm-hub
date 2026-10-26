import {
  SaasPlatformData,
  SaasPlatformMetadata,
} from '../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { SaasManagerClient } from '../../thirdparty/saasmanager/client';
import { logApp } from '../../utils/app-logger.util';

const readMetadataString = (
  body: Record<string, unknown>,
  key: keyof SaasPlatformMetadata
): string | null => {
  const value = body[key];
  return typeof value === 'string' && value !== '' ? value : null;
};

const readMetadataDate = (
  body: Record<string, unknown>,
  key: 'start_date' | 'end_date'
): string | null => {
  const value = readMetadataString(body, key);
  if (value === null) {
    return null;
  }
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    logApp.warn('The SaaS Manager returned an unparseable platform date', {
      field: key,
    });
    return null;
  }
  return new Date(time).toISOString();
};

const parseSaasPlatformData = (body: unknown): SaasPlatformData => {
  const fields: Record<string, unknown> =
    typeof body === 'object' && body !== null ? { ...body } : {};

  return {
    metadata: {
      hostname: readMetadataString(fields, 'hostname'),
      plan: readMetadataString(fields, 'plan'),
      start_date: readMetadataDate(fields, 'start_date'),
      end_date: readMetadataDate(fields, 'end_date'),
      region: readMetadataString(fields, 'region'),
    },
  };
};

export const ProductInformationHelper = {
  fetchSaasPlatformData: async (
    serviceInstanceId: ServiceInstanceId,
    platformId: string
  ): Promise<SaasPlatformData | null> => {
    try {
      const response = await SaasManagerClient.callInstanceApi({
        platform_id: platformId,
      });

      if (response.status !== 200) {
        logApp.error('Unable to load the platform data from the SaaS Manager', {
          serviceInstanceId,
          platformId,
          status: response.status,
        });
        return null;
      }
      return parseSaasPlatformData(await response.json());
    } catch (error) {
      logApp.error('Unable to load the platform data from the SaaS Manager', {
        serviceInstanceId,
        platformId,
        error,
      });
      return null;
    }
  },
};
