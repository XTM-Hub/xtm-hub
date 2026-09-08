import { describe, expect, it } from 'vitest';
import {
  ADMIN_MANAGE_TRIALS_PATH,
  xtmPlatformTrialManageUsersFromDashboardPath,
} from './constant';

describe('path constants', () => {
  it('builds the admin manage-trials path under the app prefix', () => {
    expect(ADMIN_MANAGE_TRIALS_PATH).toBe('/app/admin/manage-trials');
  });

  it('appends the dashboard origin query param to the manage-users path', () => {
    const path = xtmPlatformTrialManageUsersFromDashboardPath('bundle-1');

    expect(path).toBe(
      '/app/service/xtm-platform-trial/bundle-1/manage-users?from=dashboard'
    );
  });
});
