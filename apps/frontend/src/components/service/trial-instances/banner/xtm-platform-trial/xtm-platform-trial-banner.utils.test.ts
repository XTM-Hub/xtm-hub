import { DeploymentRequestHubStatus } from '@graphql/generated';
import { describe, expect, it } from 'vitest';
import { deriveXtmPlatformTrialState } from './xtm-platform-trial-banner.utils';

const NOW = new Date('2025-06-15T00:00:00.000Z');

describe('deriveXtmPlatformTrialState', () => {
  it.each([
    {
      description: 'blacklisted organization, no bundle',
      isBlacklisted: true,
      hubStatus: undefined,
      endDate: undefined,
      expected: { state: 'none', daysLeft: null },
    },
    {
      description: 'blacklisted organization, active bundle',
      isBlacklisted: true,
      hubStatus: DeploymentRequestHubStatus.Active,
      endDate: '2025-06-20',
      expected: { state: 'none', daysLeft: null },
    },
    {
      description: 'no bundle request yet',
      isBlacklisted: false,
      hubStatus: undefined,
      endDate: undefined,
      expected: { state: 'no-trial', daysLeft: null },
    },
    {
      description: 'bundle queued',
      isBlacklisted: false,
      hubStatus: DeploymentRequestHubStatus.Queued,
      endDate: null,
      expected: { state: 'no-trial', daysLeft: null },
    },
    {
      description: 'bundle pending',
      isBlacklisted: false,
      hubStatus: DeploymentRequestHubStatus.Pending,
      endDate: null,
      expected: { state: 'no-trial', daysLeft: null },
    },
    {
      description: 'bundle provisioning',
      isBlacklisted: false,
      hubStatus: DeploymentRequestHubStatus.Provisioning,
      endDate: null,
      expected: { state: 'no-trial', daysLeft: null },
    },
    {
      description: 'bundle failed',
      isBlacklisted: false,
      hubStatus: DeploymentRequestHubStatus.Failed,
      endDate: null,
      expected: { state: 'no-trial', daysLeft: null },
    },
    {
      description: 'bundle cancelled',
      isBlacklisted: false,
      hubStatus: DeploymentRequestHubStatus.Cancelled,
      endDate: '2025-06-10',
      expected: { state: 'none', daysLeft: null },
    },
    {
      description: 'bundle expired',
      isBlacklisted: false,
      hubStatus: DeploymentRequestHubStatus.Expired,
      endDate: '2025-06-10',
      expected: { state: 'none', daysLeft: null },
    },
    {
      description: 'active, 8 days left -> active state',
      isBlacklisted: false,
      hubStatus: DeploymentRequestHubStatus.Active,
      endDate: '2025-06-23',
      expected: { state: 'active', daysLeft: 8 },
    },
    {
      description: 'active, 7 days left -> ending state (boundary)',
      isBlacklisted: false,
      hubStatus: DeploymentRequestHubStatus.Active,
      endDate: '2025-06-22',
      expected: { state: 'ending', daysLeft: 7 },
    },
    {
      description: 'active, 1 day left -> ending state',
      isBlacklisted: false,
      hubStatus: DeploymentRequestHubStatus.Active,
      endDate: '2025-06-16',
      expected: { state: 'ending', daysLeft: 1 },
    },
    {
      description: 'active, 0 days left -> hidden',
      isBlacklisted: false,
      hubStatus: DeploymentRequestHubStatus.Active,
      endDate: '2025-06-15',
      expected: { state: 'none', daysLeft: 0 },
    },
    {
      description: 'active, end date in the past -> hidden',
      isBlacklisted: false,
      hubStatus: DeploymentRequestHubStatus.Active,
      endDate: '2025-06-01',
      expected: { state: 'none', daysLeft: -14 },
    },
  ])('$description', ({ isBlacklisted, hubStatus, endDate, expected }) => {
    expect(
      deriveXtmPlatformTrialState({
        isBlacklisted,
        hubStatus,
        endDate,
        now: NOW,
      })
    ).toEqual(expected);
  });
});
