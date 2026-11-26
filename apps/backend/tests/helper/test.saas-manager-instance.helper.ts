import { v4 as uuidv4 } from 'uuid';
import { db } from '../../knexfile';
import SaasManagerInstance, {
  SaasManagerInstanceId,
} from '../../src/model/kanel/public/SaasManagerInstance';
import { IN_SERVICE_STATUS_FAMILY } from '../../src/modules/saas-manager-instance/saas-manager-instance.schema';

interface SaasManagerInstanceFixture {
  id?: string;
  data?: Record<string, unknown>;
  metrics?: Record<string, unknown> | null;
  customer_name?: string;
  customer_techname?: string | null;
  hostname?: string | null;
  product?: string | null;
  status_family?: string | null;
  generated_at?: Date;
}

export const TestSaasManagerInstanceHelper = {
  saasManagerInstance: {
    // An instance in service, its data carrying its id.
    create: async ({
      id = uuidv4(),
      data = {},
      metrics = null,
      customer_name = 'test-customer',
      customer_techname = null,
      hostname = null,
      product = null,
      status_family = IN_SERVICE_STATUS_FAMILY,
      generated_at = new Date(),
    }: SaasManagerInstanceFixture = {}): Promise<SaasManagerInstanceId> => {
      await db<SaasManagerInstance>('SaasManagerInstance').insert({
        id: id as SaasManagerInstanceId,
        data: JSON.stringify({ id, ...data }),
        metrics: metrics === null ? null : JSON.stringify(metrics),
        customer_name,
        customer_techname,
        hostname,
        product,
        plan_name: typeof data.plan === 'string' ? data.plan : 'test-plan',
        status_family,
        generated_at,
      });
      return id as SaasManagerInstanceId;
    },
    load: async (id: string): Promise<SaasManagerInstance | undefined> =>
      db<SaasManagerInstance>('SaasManagerInstance')
        .where({ id: id as SaasManagerInstanceId })
        .first(),
    delete: async (ids: string[]) => {
      await db<SaasManagerInstance>('SaasManagerInstance')
        .whereIn('id', ids)
        .del();
    },
  },
};
