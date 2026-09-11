import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import { TEST_ORGANIZATIONS } from '../../../tests/tests.const';
import {
  DeploymentRequestDeploymentType,
  DeploymentRequestHubStatus,
  DeploymentRequestPlatformRegion,
  DeploymentRequestPlatformState,
  DeploymentRequestSource,
  PlatformIdentifier,
} from '../../__generated__/resolvers-types';
import DeploymentRequestModel, {
  DeploymentRequestId,
} from '../../model/kanel/public/DeploymentRequest';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { UserId } from '../../model/kanel/public/User';
import { AlreadyExistsErrorCode } from '../../utils/error/error.code';
import { DeploymentRequestDomain } from './deployment.domain';
import { DeploymentHelper } from './deployment.helper';

const buildDeploymentRequest = (
  overrides: Partial<DeploymentRequestModel> = {}
): DeploymentRequestModel => ({
  id: uuidv4() as DeploymentRequestId,
  user_requester_id: uuidv4() as UserId,
  organization_requester_id: uuidv4() as OrganizationId,
  service_instance_id: uuidv4() as ServiceInstanceId,
  type: DeploymentRequestDeploymentType.Trial,
  request_date: new Date('2025-01-01'),
  start_date: new Date('2025-01-01'),
  end_date: new Date('2025-02-01'),
  platform_identifier: PlatformIdentifier.Opencti,
  region: DeploymentRequestPlatformRegion.EuWest,
  activity_sector: null,
  platform_token: uuidv4(),
  platform_id: 'platform-123',
  failure_reason: null,
  job_title: null,
  use_case: null,
  hub_status: DeploymentRequestHubStatus.Pending,
  target_state: DeploymentRequestPlatformState.Active,
  actual_state: DeploymentRequestPlatformState.Provisioning,
  ordering: 0,
  counts_in_orga_quota: true,
  cancellation_user_id: null,
  cancellation_date: null,
  cancellation_reason: null,
  source: DeploymentRequestSource.Xtmhub,
  parent_id: null,
  url: null,
  ...overrides,
});

describe('isHubStatusTransitionValid', () => {
  const validTransitions = [
    [DeploymentRequestHubStatus.Queued, DeploymentRequestHubStatus.Pending],
    [DeploymentRequestHubStatus.Queued, DeploymentRequestHubStatus.Cancelled],
    [DeploymentRequestHubStatus.Pending, DeploymentRequestHubStatus.Active],
    [
      DeploymentRequestHubStatus.Pending,
      DeploymentRequestHubStatus.Provisioning,
    ],
    [DeploymentRequestHubStatus.Pending, DeploymentRequestHubStatus.Failed],
    [DeploymentRequestHubStatus.Pending, DeploymentRequestHubStatus.Cancelled],
    [
      DeploymentRequestHubStatus.Provisioning,
      DeploymentRequestHubStatus.Active,
    ],
    [
      DeploymentRequestHubStatus.Provisioning,
      DeploymentRequestHubStatus.Cancelled,
    ],
    [DeploymentRequestHubStatus.Active, DeploymentRequestHubStatus.Expired],
    [DeploymentRequestHubStatus.Active, DeploymentRequestHubStatus.Cancelled],
    [DeploymentRequestHubStatus.Failed, DeploymentRequestHubStatus.Pending],
    [DeploymentRequestHubStatus.Failed, DeploymentRequestHubStatus.Active],
  ] as const;

  it.each(validTransitions)(
    'should allow valid hub status transition: %s to %s',
    (from, to) => {
      expect(DeploymentHelper.isHubStatusTransitionValid(from, to)).toBe(true);
    }
  );

  const invalidTransitions = [
    [DeploymentRequestHubStatus.Queued, DeploymentRequestHubStatus.Active],
    [DeploymentRequestHubStatus.Active, DeploymentRequestHubStatus.Pending],
    [DeploymentRequestHubStatus.Expired, DeploymentRequestHubStatus.Active],
    [DeploymentRequestHubStatus.Cancelled, DeploymentRequestHubStatus.Active],
    [DeploymentRequestHubStatus.Expired, DeploymentRequestHubStatus.Pending],
  ] as const;

  it.each(invalidTransitions)(
    'should reject invalid hub status transition: %s to %s',
    (from, to) => {
      expect(DeploymentHelper.isHubStatusTransitionValid(from, to)).toBe(false);
    }
  );

  it('should allow same hub status transitions', () => {
    const allStatuses = Object.values(DeploymentRequestHubStatus);
    allStatuses.forEach((status) => {
      expect(DeploymentHelper.isHubStatusTransitionValid(status, status)).toBe(
        true
      );
    });
  });
});

describe('isPlatformStateTransitionValid', () => {
  it.each`
    from                                            | to                                             | targetState
    ${DeploymentRequestPlatformState.Unprovisioned} | ${DeploymentRequestPlatformState.Provisioning} | ${DeploymentRequestPlatformState.Active}
    ${DeploymentRequestPlatformState.Provisioning}  | ${DeploymentRequestPlatformState.Active}       | ${DeploymentRequestPlatformState.Active}
    ${DeploymentRequestPlatformState.Provisioning}  | ${DeploymentRequestPlatformState.Removing}     | ${DeploymentRequestPlatformState.Removed}
    ${DeploymentRequestPlatformState.Provisioning}  | ${DeploymentRequestPlatformState.Removed}      | ${DeploymentRequestPlatformState.Removed}
    ${DeploymentRequestPlatformState.Active}        | ${DeploymentRequestPlatformState.Removing}     | ${DeploymentRequestPlatformState.Removed}
    ${DeploymentRequestPlatformState.Active}        | ${DeploymentRequestPlatformState.Removed}      | ${DeploymentRequestPlatformState.Removed}
    ${DeploymentRequestPlatformState.Removing}      | ${DeploymentRequestPlatformState.Removed}      | ${DeploymentRequestPlatformState.Removed}
    ${DeploymentRequestPlatformState.Removing}      | ${DeploymentRequestPlatformState.Provisioning} | ${DeploymentRequestPlatformState.Active}
    ${DeploymentRequestPlatformState.Removed}       | ${DeploymentRequestPlatformState.Provisioning} | ${DeploymentRequestPlatformState.Active}
    ${DeploymentRequestPlatformState.Unprovisioned} | ${DeploymentRequestPlatformState.Active}       | ${DeploymentRequestPlatformState.Active}
  `(
    'should allow valid platform state transition: $from to $to with target state $targetState',
    ({ from, to, targetState }) => {
      expect(
        DeploymentHelper.isPlatformStateTransitionValid(from, to, targetState)
      ).toBe(true);
    }
  );

  it.each`
    from                                           | to                                              | targetState                               | description
    ${null}                                        | ${DeploymentRequestPlatformState.Active}        | ${DeploymentRequestPlatformState.Active}  | ${'unknown current state'}
    ${DeploymentRequestPlatformState.Provisioning} | ${DeploymentRequestPlatformState.Unprovisioned} | ${DeploymentRequestPlatformState.Active}  | ${'cannot go back to unprovisioned'}
    ${DeploymentRequestPlatformState.Active}       | ${null}                                         | ${DeploymentRequestPlatformState.Active}  | ${'unknown next state'}
    ${DeploymentRequestPlatformState.Removed}      | ${DeploymentRequestPlatformState.Active}        | ${DeploymentRequestPlatformState.Active}  | ${'removed platform cannot become active directly'}
    ${DeploymentRequestPlatformState.Removing}     | ${DeploymentRequestPlatformState.Provisioning}  | ${DeploymentRequestPlatformState.Removed} | ${'redeploy is not expected while removal is targeted'}
    ${DeploymentRequestPlatformState.Removed}      | ${DeploymentRequestPlatformState.Provisioning}  | ${DeploymentRequestPlatformState.Removed} | ${'redeploy is not expected while removal is targeted'}
    ${DeploymentRequestPlatformState.Removing}     | ${DeploymentRequestPlatformState.Provisioning}  | ${null}                                   | ${'no target state to justify a redeploy'}
    ${DeploymentRequestPlatformState.Removed}      | ${DeploymentRequestPlatformState.Provisioning}  | ${null}                                   | ${'no target state to justify a redeploy'}
  `(
    'should reject invalid platform state transition: $from to $to with target state $targetState ($description)',
    ({ from, to, targetState }) => {
      expect(
        DeploymentHelper.isPlatformStateTransitionValid(from, to, targetState)
      ).toBe(false);
    }
  );

  it('should allow same platform state transitions', () => {
    const allStates = Object.values(DeploymentRequestPlatformState);
    allStates.forEach((state) => {
      expect(
        DeploymentHelper.isPlatformStateTransitionValid(state, state)
      ).toBe(true);
    });
  });
});

describe('assertFreeTrialsLimit', () => {
  it('should throw an error if a free trial already exists', async () => {
    vi.spyOn(
      DeploymentRequestDomain,
      'loadDeploymentRequestBy'
    ).mockResolvedValue(
      buildDeploymentRequest({
        id: uuidv4() as DeploymentRequestId,
        platform_identifier: PlatformIdentifier.Opencti,
        region: DeploymentRequestPlatformRegion.EuWest,
        type: DeploymentRequestDeploymentType.Trial,
        hub_status: DeploymentRequestHubStatus.Pending,
        target_state: DeploymentRequestPlatformState.Active,
        actual_state: DeploymentRequestPlatformState.Active,
      })
    );
    await expect(
      DeploymentHelper.assertFreeTrialsLimit(
        TEST_ORGANIZATIONS.FILIGRAN.ID,
        PlatformIdentifier.Opencti
      )
    ).rejects.toThrow(AlreadyExistsErrorCode.FreeTrialAlreadyExists);
  });

  it('should not throw if no trial exists', async () => {
    vi.spyOn(
      DeploymentRequestDomain,
      'loadDeploymentRequestBy'
    ).mockResolvedValue(undefined);

    await expect(
      DeploymentHelper.assertFreeTrialsLimit(
        TEST_ORGANIZATIONS.FILIGRAN.ID,
        PlatformIdentifier.Opencti
      )
    ).resolves.toBeUndefined();
  });
});

describe('computeHubStatus', () => {
  describe('when actualState is null/undefined', () => {
    it.each([
      [DeploymentRequestHubStatus.Pending, undefined],
      [DeploymentRequestHubStatus.Active, null],
      [DeploymentRequestHubStatus.Expired, undefined],
      [DeploymentRequestHubStatus.Cancelled, null],
    ])(
      'should return %s when actualState is %s',
      (currentStatus, actualState) => {
        const result = DeploymentHelper.computeHubStatus(
          currentStatus,
          actualState
        );
        expect(result).toBe(currentStatus);
      }
    );
  });

  describe('validation errors', () => {
    it('should throw error when current status is Queued', () => {
      const result = DeploymentHelper.computeHubStatus(
        DeploymentRequestHubStatus.Queued,
        DeploymentRequestPlatformState.Provisioning
      );
      expect(result).toBeNull();
    });

    it.each([
      [DeploymentRequestHubStatus.Pending],
      [DeploymentRequestHubStatus.Active],
      [DeploymentRequestHubStatus.Failed],
      [DeploymentRequestHubStatus.Expired],
      [DeploymentRequestHubStatus.Cancelled],
    ])(
      'should throw error when platform state is Unprovisioned from %s',
      (currentStatus) => {
        const result = DeploymentHelper.computeHubStatus(
          currentStatus,
          DeploymentRequestPlatformState.Unprovisioned
        );
        expect(result).toBeNull();
      }
    );

    it.each([
      [
        DeploymentRequestHubStatus.Active,
        DeploymentRequestPlatformState.Provisioning,
      ],
      [
        DeploymentRequestHubStatus.Expired,
        DeploymentRequestPlatformState.Active,
      ],
      [
        DeploymentRequestHubStatus.Expired,
        DeploymentRequestPlatformState.Provisioning,
      ],
      [
        DeploymentRequestHubStatus.Cancelled,
        DeploymentRequestPlatformState.Active,
      ],
      [
        DeploymentRequestHubStatus.Cancelled,
        DeploymentRequestPlatformState.Provisioning,
      ],
      [
        DeploymentRequestHubStatus.Pending,
        DeploymentRequestPlatformState.Removing,
      ],
      [
        DeploymentRequestHubStatus.Active,
        DeploymentRequestPlatformState.Removing,
      ],
      [
        DeploymentRequestHubStatus.Failed,
        DeploymentRequestPlatformState.Removing,
      ],
      [
        DeploymentRequestHubStatus.Pending,
        DeploymentRequestPlatformState.Removed,
      ],
      [
        DeploymentRequestHubStatus.Active,
        DeploymentRequestPlatformState.Removed,
      ],
      [
        DeploymentRequestHubStatus.Failed,
        DeploymentRequestPlatformState.Removed,
      ],
    ])(
      'should throw error for invalid transition from %s with platform state %s',
      (currentStatus, platformState) => {
        const result = DeploymentHelper.computeHubStatus(
          currentStatus,
          platformState
        );
        expect(result).toBeNull();
      }
    );
  });

  describe('valid state transitions', () => {
    it.each([
      [
        DeploymentRequestHubStatus.Pending,
        DeploymentRequestPlatformState.Active,
        DeploymentRequestHubStatus.Active,
      ],
      [
        DeploymentRequestHubStatus.Pending,
        DeploymentRequestPlatformState.Provisioning,
        DeploymentRequestHubStatus.Provisioning,
      ],
      [
        DeploymentRequestHubStatus.Failed,
        DeploymentRequestPlatformState.Provisioning,
        DeploymentRequestHubStatus.Provisioning,
      ],
      [
        DeploymentRequestHubStatus.Failed,
        DeploymentRequestPlatformState.Active,
        DeploymentRequestHubStatus.Active,
      ],
      [
        DeploymentRequestHubStatus.Active,
        DeploymentRequestPlatformState.Active,
        DeploymentRequestHubStatus.Active,
      ],
      [
        DeploymentRequestHubStatus.Cancelled,
        DeploymentRequestPlatformState.Removing,
        DeploymentRequestHubStatus.Cancelled,
      ],
      [
        DeploymentRequestHubStatus.Cancelled,
        DeploymentRequestPlatformState.Removed,
        DeploymentRequestHubStatus.Cancelled,
      ],
      [
        DeploymentRequestHubStatus.Expired,
        DeploymentRequestPlatformState.Removing,
        DeploymentRequestHubStatus.Expired,
      ],
      [
        DeploymentRequestHubStatus.Expired,
        DeploymentRequestPlatformState.Removed,
        DeploymentRequestHubStatus.Expired,
      ],
    ])(
      'should transition from %s with platform state %s to %s',
      (currentStatus, platformState, expectedStatus) => {
        const result = DeploymentHelper.computeHubStatus(
          currentStatus,
          platformState
        );
        expect(result).toBe(expectedStatus);
      }
    );
  });
});

describe('hasDeploymentTelemetryDataChanged', () => {
  it('should return false when all tracked fields are identical', () => {
    const base = buildDeploymentRequest();
    const copy = { ...base };

    expect(DeploymentHelper.hasDeploymentTelemetryDataChanged(base, copy)).toBe(
      false
    );
  });

  it('should return true when hub status changes', () => {
    const previous = buildDeploymentRequest({
      hub_status: DeploymentRequestHubStatus.Pending,
    });
    const current = buildDeploymentRequest({
      ...previous,
      hub_status: DeploymentRequestHubStatus.Active,
    });

    expect(
      DeploymentHelper.hasDeploymentTelemetryDataChanged(previous, current)
    ).toBe(true);
  });

  it('should return true when platform id changes', () => {
    const previous = buildDeploymentRequest({ platform_id: 'old-id' });
    const current = { ...previous, platform_id: 'new-id' };

    expect(
      DeploymentHelper.hasDeploymentTelemetryDataChanged(previous, current)
    ).toBe(true);
  });

  it('should return true when cancellation reason changes', () => {
    const previous = buildDeploymentRequest({ cancellation_reason: null });
    const current = { ...previous, cancellation_reason: 'user_request' };

    expect(
      DeploymentHelper.hasDeploymentTelemetryDataChanged(previous, current)
    ).toBe(true);
  });

  it('should return true when start date changes', () => {
    const previous = buildDeploymentRequest({
      start_date: new Date('2025-01-01'),
    });
    const current = { ...previous, start_date: new Date('2025-01-15') };

    expect(
      DeploymentHelper.hasDeploymentTelemetryDataChanged(previous, current)
    ).toBe(true);
  });

  it('should return true when end date changes', () => {
    const previous = buildDeploymentRequest({
      end_date: new Date('2025-02-01'),
    });
    const current = { ...previous, end_date: new Date('2025-03-01') };

    expect(
      DeploymentHelper.hasDeploymentTelemetryDataChanged(previous, current)
    ).toBe(true);
  });

  it('should return true when previous start date is undefined and current is defined', () => {
    const previous = buildDeploymentRequest({ start_date: null });
    const current = { ...previous, start_date: new Date('2025-01-01') };

    expect(
      DeploymentHelper.hasDeploymentTelemetryDataChanged(previous, current)
    ).toBe(true);
  });

  it('should return true when previous end date is undefined and current is defined', () => {
    const previous = buildDeploymentRequest({ end_date: null });
    const current = { ...previous, end_date: new Date('2025-01-01') };

    expect(
      DeploymentHelper.hasDeploymentTelemetryDataChanged(previous, current)
    ).toBe(true);
  });

  it('should return true when previous start date is defined and current is undefined', () => {
    const previous = buildDeploymentRequest({
      start_date: new Date('2025-01-01'),
    });
    const current = { ...previous, start_date: null };

    expect(
      DeploymentHelper.hasDeploymentTelemetryDataChanged(previous, current)
    ).toBe(true);
  });

  it('should return false when both start dates are undefined', () => {
    const end_date = new Date('2025-01-01');
    const previous = buildDeploymentRequest({
      start_date: null,
      end_date,
    });
    const current = { ...previous };

    expect(
      DeploymentHelper.hasDeploymentTelemetryDataChanged(previous, current)
    ).toBe(false);
  });

  it('should return false when both end dates are undefined', () => {
    const start_date = new Date('2025-01-01');
    const previous = buildDeploymentRequest({
      start_date,
      end_date: null,
    });
    const current = { ...previous };

    expect(
      DeploymentHelper.hasDeploymentTelemetryDataChanged(previous, current)
    ).toBe(false);
  });

  it('should return true when date object references differ but timestamps match a changed field', () => {
    const previous = buildDeploymentRequest({
      start_date: new Date('2025-01-01'),
      end_date: new Date('2025-02-01'),
      platform_id: 'platform-before',
    });
    const current = {
      ...previous,
      start_date: new Date('2025-01-01'),
      end_date: new Date('2025-02-01'),
      platform_id: 'platform-after',
    };

    expect(
      DeploymentHelper.hasDeploymentTelemetryDataChanged(previous, current)
    ).toBe(true);
  });

  it('should return false when date object references differ but timestamps and tracked fields are equal', () => {
    const previous = buildDeploymentRequest({
      start_date: new Date('2025-01-01'),
      end_date: new Date('2025-02-01'),
    });
    const current = {
      ...previous,
      start_date: new Date('2025-01-01'),
      end_date: new Date('2025-02-01'),
    };

    expect(
      DeploymentHelper.hasDeploymentTelemetryDataChanged(previous, current)
    ).toBe(false);
  });
});

describe('computeBundleDates', () => {
  it.each([
    {
      description: 'the min start_date and max end_date across children',
      childDates: [
        {
          start_date: new Date('2025-02-01'),
          end_date: new Date('2025-05-01'),
        },
        {
          start_date: new Date('2025-01-01'),
          end_date: new Date('2025-06-01'),
        },
      ],
      expected: {
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-06-01'),
      },
    },
    {
      description: 'the dates of the children with null dates ignored',
      childDates: [
        { start_date: null, end_date: null },
        {
          start_date: new Date('2025-01-01'),
          end_date: new Date('2025-06-01'),
        },
      ],
      expected: {
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-06-01'),
      },
    },
    {
      description: 'null dates when all children have null dates',
      childDates: [
        { start_date: null, end_date: null },
        { start_date: null, end_date: null },
      ],
      expected: { start_date: null, end_date: null },
    },
  ])('should return $description', ({ childDates, expected }) => {
    const children = childDates.map((dates) => buildDeploymentRequest(dates));

    expect(DeploymentHelper.computeBundleDates(children)).toEqual(expected);
  });
});
