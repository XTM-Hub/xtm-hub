import { db } from '../../../../knexfile';
import { DeploymentRequestPlatformRegion } from '../../../__generated__/resolvers-types';
import { withTransaction } from '../../../context/database.context';
import DeploymentRequestModel from '../../../model/kanel/public/DeploymentRequest';
import DeploymentRequestQuota, {
  DeploymentRequestQuotaMutator,
} from '../../../model/kanel/public/DeploymentRequestQuota';
import { ErrorCode } from '../../../utils/error/error.code';

export type QuotaKey = {
  region: DeploymentRequestPlatformRegion;
};

export const bundleQuotaKey = (
  region: DeploymentRequestPlatformRegion
): QuotaKey => ({ region });

export const quotaKeysOfRequest = (
  request: DeploymentRequestModel
): QuotaKey[] => {
  if (request.parent_id !== null) {
    return [];
  }
  return [bundleQuotaKey(request.region)];
};

export const DeploymentQuotaDomain = {
  reservePlace: async (
    key: QuotaKey,
    { blocking = true }: { blocking?: boolean } = {}
  ): Promise<{ isPlaceAvailable: boolean }> => {
    return DeploymentQuotaDomain.withLockedQuotaTransaction(
      [key],
      async ([quota]) => {
        if (!quota) {
          throw new Error(ErrorCode.DeploymentRequestQuotaNotFound);
        }
        if (blocking && quota.availability <= 0) {
          return {
            isPlaceAvailable: false,
          };
        }

        await db<DeploymentRequestQuota>('DeploymentRequestQuota')
          .update({ availability: quota.availability - 1 })
          .where({ id: quota.id });
        return {
          isPlaceAvailable: true,
        };
      }
    );
  },

  freePlace: async (key: QuotaKey): Promise<void> => {
    await DeploymentQuotaDomain.withLockedQuotaTransaction(
      [key],
      async ([quota]) => {
        if (!quota) {
          throw new Error(ErrorCode.DeploymentRequestQuotaNotFound);
        }
        await db<DeploymentRequestQuota>('DeploymentRequestQuota')
          .update({ availability: quota.availability + 1 })
          .where({ id: quota.id });
      }
    );
  },

  updateQuotaCapacity: async ({
    key,
    newCapacity,
  }: {
    key: QuotaKey;
    newCapacity: number;
  }): Promise<{ newAvailability: number }> => {
    return DeploymentQuotaDomain.withLockedQuotaTransaction(
      [key],
      async ([quota]) => {
        if (!quota) {
          throw new Error(ErrorCode.DeploymentRequestQuotaNotFound);
        }
        const difference = newCapacity - quota.capacity;
        const newAvailability = quota.availability + difference;
        await db<DeploymentRequestQuota>('DeploymentRequestQuota')
          .update({
            capacity: newCapacity,
            availability: newAvailability,
          })
          .where({ id: quota.id });

        return { newAvailability };
      }
    );
  },

  loadQuotas: async (field: DeploymentRequestQuotaMutator) => {
    return db<DeploymentRequestQuota[]>('DeploymentRequestQuota')
      .where(field)
      .select('*');
  },

  withLockedQuotaTransaction: async <T>(
    keys: QuotaKey[],
    callback: (quotas: DeploymentRequestQuota[]) => Promise<T>
  ) => {
    return withTransaction(async () => {
      const quotas: DeploymentRequestQuota[] = [];
      for (const key of keys) {
        quotas.push(await lockQuota(key));
      }

      return callback(quotas);
    });
  },
};

const lockQuota = async (key: QuotaKey): Promise<DeploymentRequestQuota> => {
  const quota = await db<DeploymentRequestQuota>('DeploymentRequestQuota')
    .where({ region: key.region })
    .select('*')
    .forUpdate()
    .first();
  if (!quota) {
    throw new Error(ErrorCode.DeploymentRequestQuotaNotFound);
  }

  return quota;
};
