import { v4 as uuidv4 } from 'uuid';
import { describe, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import { UnauthenticatedErrorCode } from '../../utils/error/error.code';
import { SaasManagerInstanceDomain } from './saas-manager-instance.domain';

// The operations exactly as SaaS Manager sends them
const UPSERT_OPERATION = `mutation ($generatedAt: Date!, $instances: [SaasManagerInstanceInput!]!) {
  upsertSaasManagerInstances(generatedAt: $generatedAt, instances: $instances) {
    applied skipped removed
  }
}`;
const PURGE_OPERATION = `mutation ($before: Date!) {
  purgeSaasManagerInstances(before: $before) { applied skipped removed }
}`;

const SYSTEM_ONLY = {
  anonymous: UnauthenticatedErrorCode.Unauthenticated,
  user: UnauthenticatedErrorCode.Unauthenticated,
  admin: UnauthenticatedErrorCode.Unauthenticated,
  system: 'allowed',
  invalidSystemToken: UnauthenticatedErrorCode.Unauthenticated,
} as const;

describe('upsertSaasManagerInstances mutation', () => {
  TestHelper.expectAccessMatrix({
    operation: UPSERT_OPERATION,
    guarded: () => vi.spyOn(SaasManagerInstanceDomain, 'upsertInstances'),
    expected: SYSTEM_ONLY,
    prepare: async () => {
      const id = uuidv4();
      return {
        variables: {
          generatedAt: new Date().toISOString(),
          instances: [
            {
              data: {
                id,
                hostname: 'access-test.example.com',
                plan: 'test-plan',
                status: 'DEPLOYED',
                customer: 'access-test',
              },
              index: { customer_name: 'access-test' },
            },
          ],
        },
        expectedData: {
          upsertSaasManagerInstances: {
            applied: 1,
            skipped: 0,
            removed: 0,
          },
        },
        cleanup: () => TestHelper.saasManagerInstance.delete([id]),
      };
    },
  });
});

describe('purgeSaasManagerInstances mutation', () => {
  TestHelper.expectAccessMatrix({
    operation: PURGE_OPERATION,
    guarded: () =>
      vi.spyOn(SaasManagerInstanceDomain, 'deleteInstancesGeneratedBefore'),
    expected: SYSTEM_ONLY,
    prepare: async () => {
      const generatedAt = new Date('2000-01-01T00:00:00.000Z');
      const id = await TestHelper.saasManagerInstance.create({
        generated_at: generatedAt,
      });
      return {
        variables: { before: '2000-01-01T00:00:01.000Z' },
        expectedData: {
          purgeSaasManagerInstances: { applied: 0, skipped: 0, removed: 1 },
        },
        cleanup: () => TestHelper.saasManagerInstance.delete([id]),
      };
    },
  });
});
