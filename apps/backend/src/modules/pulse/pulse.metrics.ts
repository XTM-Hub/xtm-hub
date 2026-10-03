import { Counter } from 'prom-client';

export const pulseRecordsAcceptedCounter = new Counter({
  name: 'pulse_records_accepted_total',
  help: 'Threat Pulse records accepted from contributing platforms',
  labelNames: ['object_type'],
});

export const pulseRequestsRejectedCounter = new Counter({
  name: 'pulse_requests_rejected_total',
  help: 'Threat Pulse requests rejected, by operation and error code',
  labelNames: ['operation', 'code'],
});

export const pulsePurgedRecordsCounter = new Counter({
  name: 'pulse_purged_records_total',
  help: 'Threat Pulse ledger rows removed on platform purge requests',
});

export const pulseRetentionDeletedRowsCounter = new Counter({
  name: 'pulse_retention_deleted_rows_total',
  help: 'Threat Pulse rows removed by the retention job, by table',
  labelNames: ['table'],
});
