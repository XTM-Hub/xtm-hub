import { PgBoss, type JobSpyInterface } from 'pg-boss';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import portalConfig from '../../config';
import { logApp } from '../../utils/app-logger.util';
import { DeadLetterWorkers } from './deadletter.workers';
import { HUBSPOT_QUEUES } from './hubspot.jobs';
import { HubspotWorkers } from './hubspot.workers';
import { RETRY_STRATEGIES } from './retry-strategies';
import { TEAMS_NOTIFICATION_QUEUES } from './teams-notification.jobs';
import { TeamsNotificationWorkers } from './teams-notification.workers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Poll a queue via `findJobs` until the predicate is satisfied. */
async function waitForQueue(
  boss: PgBoss,
  queueName: string,
  timeoutMs = 5_000,
  intervalMs = 200
): Promise<unknown[]> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const jobs = await boss.findJobs<unknown>(queueName);
    if (jobs.length > 0) return jobs;
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  return [];
}

// ---------------------------------------------------------------------------
// Unit tests – verify queue wiring via a mocked PgBoss instance
// ---------------------------------------------------------------------------
describe('workers – queue configuration (unit)', () => {
  it('should create deadletter queue and wire hubspot queues with standard retry + deadletter', async () => {
    const createQueue = vi.fn();
    const work = vi.fn();
    const boss = { createQueue, work } as unknown as PgBoss;

    await HubspotWorkers.start(boss);

    // Dead-letter queue created first (with DLQ strategy: no retry, 30-day retention)
    expect(createQueue).toHaveBeenCalledWith(HUBSPOT_QUEUES.DEAD_LETTER, {
      ...RETRY_STRATEGIES.dlq,
    });

    // Login queue
    expect(createQueue).toHaveBeenCalledWith(HUBSPOT_QUEUES.LOGIN, {
      ...RETRY_STRATEGIES.standard,
      deadLetter: HUBSPOT_QUEUES.DEAD_LETTER,
    });

    // ReachOutSales queue
    expect(createQueue).toHaveBeenCalledWith(HUBSPOT_QUEUES.REACH_OUT_SALES, {
      ...RETRY_STRATEGIES.standard,
      deadLetter: HUBSPOT_QUEUES.DEAD_LETTER,
    });

    // Workers registered for both queues
    expect(work).toHaveBeenCalledWith(
      HUBSPOT_QUEUES.LOGIN,
      { batchSize: 1 },
      expect.any(Function)
    );
    expect(work).toHaveBeenCalledWith(
      HUBSPOT_QUEUES.REACH_OUT_SALES,
      { batchSize: 1 },
      expect.any(Function)
    );
  });

  it('should create deadletter queue and wire the teams notification queue with standard retry + deadletter', async () => {
    // Given
    const createQueue = vi.fn();
    const work = vi.fn();
    const boss = { createQueue, work } as unknown as PgBoss;

    // When
    await TeamsNotificationWorkers.start(boss);

    // Then
    expect(createQueue).toHaveBeenCalledWith(
      TEAMS_NOTIFICATION_QUEUES.DEAD_LETTER,
      { ...RETRY_STRATEGIES.dlq }
    );
    expect(createQueue).toHaveBeenCalledWith(TEAMS_NOTIFICATION_QUEUES.SEND, {
      ...RETRY_STRATEGIES.standard,
      deadLetter: TEAMS_NOTIFICATION_QUEUES.DEAD_LETTER,
    });
    expect(work).toHaveBeenCalledWith(
      TEAMS_NOTIFICATION_QUEUES.SEND,
      { batchSize: 1 },
      expect.any(Function)
    );
  });
});

// ---------------------------------------------------------------------------
// Integration tests – verify dead-letter behavior against real Postgres
// ---------------------------------------------------------------------------
describe('workers – dead-letter routing (integration)', () => {
  let boss: PgBoss;
  const TEST_SCHEMA = 'pgboss_test';

  const SOURCE_QUEUE = 'test_source';

  beforeAll(async () => {
    const { host, port, user, password, database } = portalConfig.database;

    boss = new PgBoss({
      host,
      port,
      user,
      password,
      database,
      schema: TEST_SCHEMA,
      __test__enableSpies: true,
    });

    await boss.start();
  }, 5_000);

  beforeEach(async () => {
    boss.clearSpies();

    await boss.createQueue(HUBSPOT_QUEUES.DEAD_LETTER);
    await boss.createQueue(SOURCE_QUEUE, {
      retryLimit: 0,
      deadLetter: HUBSPOT_QUEUES.DEAD_LETTER,
    });
  });

  afterEach(async () => {
    await boss.offWork(SOURCE_QUEUE).catch(() => {});
    await boss.offWork(HUBSPOT_QUEUES.DEAD_LETTER).catch(() => {});
    await boss.deleteQueue(SOURCE_QUEUE);
    await boss.deleteQueue(HUBSPOT_QUEUES.DEAD_LETTER);
  });

  afterAll(async () => {
    if (boss) {
      await boss.stop({ graceful: true, timeout: 1_000 });
    }
  }, 1_500);

  it('should move a failed job to the dead-letter queue after retries are exhausted', async () => {
    // Obtain a spy for the source queue so we can wait for the job to fail
    const sourceSpy: JobSpyInterface = boss.getSpy(SOURCE_QUEUE);

    // Register a worker that always fails (poll fast for tests)
    await boss.work(
      SOURCE_QUEUE,
      { batchSize: 1, pollingIntervalSeconds: 0.5 },
      async () => {
        throw new Error('Simulated failure');
      }
    );

    // Enqueue a job
    const jobId = await boss.send(SOURCE_QUEUE, {
      type: 'test',
      payload: { hello: 'world' },
    });

    expect(jobId).toBeTruthy();

    // Use the spy to deterministically wait for the job to reach "failed" state
    const failedJob = await sourceSpy.waitForJobWithId(jobId!, 'failed');
    expect(failedJob.state).toBe('failed');
    expect(failedJob.data).toEqual({
      type: 'test',
      payload: { hello: 'world' },
    });

    // The dead-letter copy is inserted by the DB (not via send()), so we still
    // need a short poll to confirm it arrived in the DLQ.
    const deadLetterJobs = await waitForQueue(boss, HUBSPOT_QUEUES.DEAD_LETTER);

    expect(deadLetterJobs.length).toBeGreaterThanOrEqual(1);
  }, 5_000);

  it('should NOT dead-letter a job that succeeds', async () => {
    // Obtain a spy for the source queue
    const sourceSpy: JobSpyInterface = boss.getSpy(SOURCE_QUEUE);

    // Register a worker that succeeds (poll fast for tests)
    await boss.work(
      SOURCE_QUEUE,
      { batchSize: 1, pollingIntervalSeconds: 0.5 },
      async () => {
        // success – no throw
      }
    );

    const jobId = await boss.send(SOURCE_QUEUE, {
      type: 'test',
      payload: { ok: true },
    });

    expect(jobId).toBeTruthy();

    // Use the spy to deterministically wait for the job to complete
    const completedJob = await sourceSpy.waitForJobWithId(jobId!, 'completed');
    expect(completedJob.state).toBe('completed');

    // Verify nothing landed in the DLQ
    const deadLetterJobs = await boss.findJobs(HUBSPOT_QUEUES.DEAD_LETTER);
    expect(deadLetterJobs).toHaveLength(0);
  }, 5_000);

  it('should log when the DLQ worker processes a dead-lettered job', async () => {
    const logSpy = vi.spyOn(logApp, 'error');

    // Obtain a spy for the DLQ so we can wait for the worker to complete
    const dlqSpy: JobSpyInterface = boss.getSpy(HUBSPOT_QUEUES.DEAD_LETTER);

    // Start the real DeadLetterWorkers with fast polling (queue already created in beforeEach)
    await DeadLetterWorkers.start(boss, { pollingIntervalSeconds: 0.5 });

    // Enqueue directly into the DLQ (routing is already tested above)
    const jobId = await boss.send(HUBSPOT_QUEUES.DEAD_LETTER, {
      type: 'dlq_log_test',
      payload: { testing: 'logs' },
    });

    expect(jobId).toBeTruthy();

    // Use the spy to deterministically wait for the DLQ worker to complete the job
    const completedJob = await dlqSpy.waitForJobWithId(jobId!, 'completed');
    expect(completedJob.state).toBe('completed');

    // Assert logApp.error was called with the expected DLQ message
    const dlqCall = logSpy.mock.calls.find(
      (call) => call[0] === '[PgBoss DLQ] Job dead-lettered'
    );

    expect(dlqCall).toBeDefined();

    const meta = dlqCall![1] as Record<string, unknown>;
    expect(meta.dlqQueue).toBe(HUBSPOT_QUEUES.DEAD_LETTER);
    expect(meta.data).toEqual({
      type: 'dlq_log_test',
      payload: { testing: 'logs' },
    });

    logSpy.mockRestore();
  }, 5_000);
});
