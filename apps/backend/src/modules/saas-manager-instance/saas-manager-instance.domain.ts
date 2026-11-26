import { applySearch, db, dbConnections, dbRaw } from '../../../knexfile';
import {
  OrderingMode,
  SaasPlatformOrdering,
  SaasProduct,
} from '../../__generated__/resolvers-types';
import type SaasManagerInstance from '../../model/kanel/public/SaasManagerInstance';
import type {
  SaasManagerInstanceId,
  SaasManagerInstanceInitializer,
} from '../../model/kanel/public/SaasManagerInstance';
import { IN_SERVICE_STATUS_FAMILY } from './saas-manager-instance.schema';

const TABLE = 'SaasManagerInstance';

// A row to write: its JSON serialized, its end date as a day (YYYY-MM-DD).
export type SaasManagerInstanceRow = Omit<
  SaasManagerInstanceInitializer,
  'data' | 'metrics' | 'end_date'
> & { data: string; metrics: string | null; end_date: string | null };

export interface SaasManagerInstancePagination {
  first: number;
  after?: string | null;
  orderBy: SaasPlatformOrdering;
  orderMode: OrderingMode;
  searchTerm?: string | null;
  product?: SaasProduct | null;
}

// The plan names that are sizes, from the smallest.
const PLAN_SIZES = ['XS', 'S', 'M', 'L', 'XL'];

export const SaasManagerInstanceDomain = {
  /**
   * One statement per call, so two calls on the same instance cannot interleave: the row generated last wins, and an
   * instance sent without metrics keeps the stored ones. Returns the ids written.
   */
  upsertInstances: async (
    instances: SaasManagerInstanceRow[]
  ): Promise<SaasManagerInstanceId[]> => {
    if (instances.length === 0) {
      return [];
    }
    const written: Pick<SaasManagerInstance, 'id'>[] =
      await db<SaasManagerInstanceRow>(TABLE)
        .insert(instances)
        .onConflict('id')
        .merge({
          data: dbRaw('excluded.data'),
          metrics: dbRaw('COALESCE(excluded.metrics, ??)', [
            `${TABLE}.metrics`,
          ]),
          customer_name: dbRaw('excluded.customer_name'),
          customer_techname: dbRaw('excluded.customer_techname'),
          plan_name: dbRaw('excluded.plan_name'),
          status_family: dbRaw('excluded.status_family'),
          upgrade_group: dbRaw('excluded.upgrade_group'),
          product: dbRaw('excluded.product'),
          hostname: dbRaw('excluded.hostname'),
          end_date: dbRaw('excluded.end_date'),
          generated_at: dbRaw('excluded.generated_at'),
        })
        .where(`${TABLE}.generated_at`, '<=', dbRaw('excluded.generated_at'))
        .returning('id');
    return written.map(({ id }) => id);
  },

  // Returns the number of instances deleted, from the rows: the count del() answers does not survive postProcessResponse.
  deleteInstancesGeneratedBefore: async (before: Date): Promise<number> => {
    const deleted: Pick<SaasManagerInstance, 'id'>[] =
      await db<SaasManagerInstance>(TABLE)
        .where('generated_at', '<', before)
        .del('id');
    return deleted.length;
  },

  loadInstance: async (
    id: SaasManagerInstanceId
  ): Promise<
    Pick<SaasManagerInstance, 'data' | 'metrics' | 'generated_at'> | undefined
  > =>
    db<SaasManagerInstance>(TABLE)
      .where({ id })
      .first<
        | Pick<SaasManagerInstance, 'data' | 'metrics' | 'generated_at'>
        | undefined
      >('data', 'metrics', 'generated_at'),

  /**
   * The instances in service, paged as the other lists of the Hub. Only their list row is read: their metrics are too
   * heavy to load a page with.
   */
  loadInServiceInstances: async ({
    first,
    after,
    orderBy,
    orderMode,
    searchTerm,
    product,
  }: SaasManagerInstancePagination) => {
    const query = db<SaasManagerInstance>(TABLE).where({
      status_family: IN_SERVICE_STATUS_FAMILY,
    });
    if (product) {
      query.where({ product });
    }
    await applySearch(TABLE, query, searchTerm);

    const totalCountQuery = query
      .clone()
      .count<{ totalCount: string }[]>('id as totalCount')
      .first();

    if (orderBy === SaasPlatformOrdering.Plan) {
      // The plans named as a size are ordered by size, before the others, in either direction.
      query.orderByRaw(
        `CASE UPPER(plan_name) ${PLAN_SIZES.map((_, rank) => `WHEN ? THEN ${rank}`).join(' ')} END ${orderMode} NULLS LAST`,
        PLAN_SIZES
      );
    }
    const offset = after ? Number(atob(after)) : 0;
    const rowsQuery = query
      .orderBy([
        {
          column: orderBy === SaasPlatformOrdering.Plan ? 'plan_name' : orderBy,
          order: orderMode,
          nulls: 'last',
        },
        { column: 'id', order: 'asc' },
      ])
      .offset(offset)
      .limit(first)
      .select<
        Pick<
          SaasManagerInstance,
          'id' | 'data' | 'customer_name' | 'generated_at'
        >[]
      >('id', 'data', 'customer_name', 'generated_at');

    const [rows, counted] = await Promise.all([rowsQuery, totalCountQuery]);
    return dbConnections(
      rows,
      after ?? undefined,
      first,
      Number(counted?.totalCount ?? 0)
    );
  },
};
