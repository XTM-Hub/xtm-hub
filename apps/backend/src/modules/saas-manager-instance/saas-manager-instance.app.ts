import type z from 'zod';
import {
  SaasProduct,
  type SaasManagerInstanceInput,
  type SaasManagerSyncResult,
} from '../../__generated__/resolvers-types';
import type { SaasManagerInstanceId } from '../../model/kanel/public/SaasManagerInstance';
import { logApp } from '../../utils/app-logger.util';
import { BadRequestErrorCode } from '../../utils/error/error.code';
import { toIsoDate } from '../../utils/format';
import { isRecord } from '../../utils/typescript';
import { isUuid } from '../../utils/uuid.util';
import {
  SaasManagerInstanceDomain,
  type SaasManagerInstanceRow,
} from './saas-manager-instance.domain';
import { toSaasProduct } from './saas-manager-instance.helper';
import {
  SaasManagerInstanceSchema,
  type ValidSaasManagerInstance,
} from './saas-manager-instance.schema';

// How far ahead of the Hub's clock SaaS Manager's may be. An instance generated later than that would refuse every
// push until that date, and no purge would remove it; a purge before a later date would delete every instance.
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

// The instances one push may carry. They are written in one statement, which PostgreSQL caps at 65,535 bind parameters,
// 12 per instance: a larger snapshot is pushed in several calls.
export const MAX_INSTANCES_PER_PUSH = 1000;

const parseDate = (value: unknown): Date => {
  const date =
    typeof value === 'string' || value instanceof Date ? new Date(value) : null;
  if (date === null || Number.isNaN(date.getTime())) {
    throw new Error(BadRequestErrorCode.InvalidSaasManagerInstance);
  }
  return date;
};

// A date SaaS Manager sends, refused when it is further ahead of the Hub's clock than MAX_CLOCK_SKEW_MS.
const parseSaasManagerDate = (value: unknown, field: string): Date => {
  const date = parseDate(value);
  if (date.getTime() > Date.now() + MAX_CLOCK_SKEW_MS) {
    logApp.warn('Refused a SaaS Manager date in the future', {
      field,
      date: date.toISOString(),
    });
    throw new Error(BadRequestErrorCode.InvalidSaasManagerInstance);
  }
  return date;
};

const toRow = (
  { data, index, metrics }: ValidSaasManagerInstance,
  sent: SaasManagerInstanceInput,
  generatedAt: Date
): SaasManagerInstanceRow => ({
  id: data.id as SaasManagerInstanceId,
  // Stored as sent, not as parsed, and serialized here: the driver would send an array as a PostgreSQL array.
  data: JSON.stringify(sent.data),
  metrics: metrics ? JSON.stringify(sent.metrics) : null,
  customer_name: index.customer_name,
  customer_techname: index.customer_techname ?? null,
  plan_name: data.plan,
  status_family: index.status_family ?? null,
  upgrade_group: index.upgrade_group ?? null,
  // Read as the list serves them, so that it filters and orders on what it shows.
  product: toSaasProduct(data.product ?? null),
  hostname: data.hostname || null,
  // The UTC day of the end date.
  end_date: toIsoDate(data.end_date)?.slice(0, 10) ?? null,
  generated_at: generatedAt,
});

type Issue = z.core.$ZodIssue;

const toPath = (issue: Issue): string => issue.path.map(String).join('.');

// Each field refused and why. The messages of zod name the expected type or values, never the value sent.
const toReason = (issues: Issue[]): string =>
  issues.map((issue) => `${toPath(issue)}: ${issue.message}`).join('; ');

// An instance of the push that does not match what the Hub reads: its index in the push, its id and why.
interface RejectedInstance {
  position: number;
  id: string | null;
  reason: string;
}

// The id of a rejected instance, when it is one the Hub could have stored.
const readRejectedId = (data: unknown): string | null =>
  isRecord(data) && typeof data.id === 'string' && isUuid(data.id)
    ? data.id
    : null;

// The products the Hub stores from SaaS Manager. Not ONE: the Hub does not serve ONE instances from SaaS Manager.
const STORED_SAAS_PRODUCTS: ReadonlySet<SaasProduct> = new Set([
  SaasProduct.Octi,
  SaasProduct.Oaev,
]);

// The product of an instance the Hub does not store, as sent: SaaS Manager also pushes the instances of its other
// products. Null when the instance names no product, or one that is not a string, which the schema judges.
const readUnservedProduct = (data: unknown): string | null => {
  const product = isRecord(data) ? data.product : null;
  if (typeof product !== 'string') {
    return null;
  }
  const code = toSaasProduct(product);
  return code !== null && STORED_SAAS_PRODUCTS.has(code) ? null : product;
};

export const SaasManagerInstanceApp = {
  /**
   * Writes each instance unless the Hub stores a copy generated after generatedAt. An instance sent twice is written
   * once, as sent last. An instance of a product the Hub does not store from SaaS Manager (any but OCTI and OAEV),
   * whatever its case, is ignored before it is validated: it is not written, does not refuse the push, and counts as
   * skipped. Any other invalid instance refuses the push as a whole: none is written, and SaaS Manager, whose call
   * failed, does not purge, so the Hub keeps every copy it stores.
   */
  upsertInstances: async ({
    generatedAt,
    instances,
  }: {
    generatedAt: unknown;
    instances: SaasManagerInstanceInput[];
  }): Promise<SaasManagerSyncResult> => {
    if (instances.length > MAX_INSTANCES_PER_PUSH) {
      logApp.warn('Refused a SaaS Manager push above the maximum size', {
        instances: instances.length,
        max: MAX_INSTANCES_PER_PUSH,
      });
      throw new Error(BadRequestErrorCode.InvalidSaasManagerInstance);
    }
    const generatedAtDate = parseSaasManagerDate(generatedAt, 'generatedAt');
    const rows = new Map<string, SaasManagerInstanceRow>();
    const rejected: RejectedInstance[] = [];
    // The instances ignored, counted by product as sent.
    const ignored = new Map<string, number>();
    instances.forEach((instance, position) => {
      const unservedProduct = readUnservedProduct(instance.data);
      if (unservedProduct !== null) {
        ignored.set(unservedProduct, (ignored.get(unservedProduct) ?? 0) + 1);
        return;
      }
      const parsed = SaasManagerInstanceSchema.safeParse(instance);
      if (!parsed.success) {
        rejected.push({
          position,
          id: readRejectedId(instance.data),
          reason: toReason(parsed.error.issues),
        });
        return;
      }
      const row = toRow(parsed.data, instance, generatedAtDate);
      // Deleted first so that the instance takes the place of its last occurrence.
      rows.delete(row.id);
      rows.set(row.id, row);
    });
    // Once per push, counted rather than listed: SaaS Manager sends them again at every push.
    if (ignored.size > 0) {
      logApp.info(
        'Ignored the SaaS Manager instances of products the Hub does not store',
        {
          ignored: Object.fromEntries(ignored),
        }
      );
    }
    // The error carries only its code: the log says which instances and fields SaaS Manager has to fix.
    if (rejected.length > 0) {
      logApp.warn('Refused a SaaS Manager push with invalid instances', {
        rejected,
      });
      throw new Error(BadRequestErrorCode.InvalidSaasManagerInstance);
    }
    const written = await SaasManagerInstanceDomain.upsertInstances([
      ...rows.values(),
    ]);
    return {
      applied: written.length,
      skipped: instances.length - written.length,
      removed: 0,
    };
  },

  purgeInstances: async ({
    before,
  }: {
    before: unknown;
  }): Promise<SaasManagerSyncResult> => {
    const beforeDate = parseSaasManagerDate(before, 'before');
    const removed =
      await SaasManagerInstanceDomain.deleteInstancesGeneratedBefore(
        beforeDate
      );
    if (removed > 0) {
      logApp.info('Purged the SaaS Manager instances it no longer has', {
        before: beforeDate.toISOString(),
        removed,
      });
    }
    return { applied: 0, skipped: 0, removed };
  },
};
