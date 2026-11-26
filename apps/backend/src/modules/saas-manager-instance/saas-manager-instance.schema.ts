import z from 'zod';

// The status families SaaS Manager files its instances under.
export const STATUS_FAMILIES = [
  '__in_service_family__',
  '__unprovisionned_family__',
  '__disabled_family__',
  '__removed_family__',
] as const;

// SaaS Manager lists only the instances in service to the Hub.
export const IN_SERVICE_STATUS_FAMILY = STATUS_FAMILIES[0];

// The objects are loose: a field SaaS Manager adds still passes, and is stored with the rest of the data.
const StorageUsage = z
  .looseObject({
    used: z.number().nullish(),
    limit: z.number().nullish(),
    percent: z.number().nullish(),
  })
  .nullable();

const InstanceData = z.looseObject({
  id: z.uuid(),
  status: z.string().min(1),
  plan: z.string().min(1),
  customer: z.string().min(1),
  // Empty, it is stored as no hostname, as before the schema.
  hostname: z.string().nullish(),
  // Whatever its case: the app skips the products the Hub does not store before validating, and normalizes the others.
  product: z.string().nullish(),
  commercial_model: z.string().nullish(),
  start_date: z.iso.date().nullish(),
  // A day, or a date with its offset, of which the list serves the UTC day.
  end_date: z.union([z.iso.date(), z.iso.datetime({ offset: true })]).nullish(),
  sla_cmtd: z.number().nullish(),
  storage: z
    .looseObject({
      es_used_size: StorageUsage.optional(),
      postgres_used_size: StorageUsage.optional(),
      s3_used_size: StorageUsage.optional(),
    })
    .nullish(),
});

const InstanceIndex = z.object({
  customer_name: z.string().min(1).max(255),
  customer_techname: z.string().max(255).nullish(),
  // Ignored by the Hub, which orders on data.plan: not required.
  plan_code: z.string().max(255).nullish(),
  status_family: z.enum(STATUS_FAMILIES).nullish(),
  upgrade_group: z.string().max(255).nullish(),
});

const Window = z.looseObject({
  start: z.iso.datetime({ offset: true }),
  end: z.iso.datetime({ offset: true }),
  resolution: z.enum(['hour', 'day']),
  series: z.array(z.looseObject({})),
});

// Keyed by the number of days asked; another key still passes.
const InstanceMetrics = z.looseObject({
  7: Window.optional(),
  32: Window.optional(),
  95: Window.optional(),
  187: Window.optional(),
});

export const SaasManagerInstanceSchema = z.object({
  data: InstanceData,
  index: InstanceIndex,
  metrics: InstanceMetrics.nullish(),
});

export type ValidSaasManagerInstance = z.infer<
  typeof SaasManagerInstanceSchema
>;
