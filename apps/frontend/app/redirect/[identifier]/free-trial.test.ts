import { loadMeUser } from '@/utils/load-me-user';
import { XTM_PLATFORM_TRIAL_PATH } from '@/utils/path/constant';
import { isFeatureEnabled } from '@/utils/settings.service';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redirectToFreeTrial } from './free-trial';
import { loadBaseUrlFront } from './utils/load';

vi.mock('./utils/load');
vi.mock('../../../src/utils/load-me-user');
vi.mock('../../../src/utils/settings.service');

const BASE_URL = 'http://localhost:3002';
const REQUEST_URL = `/redirect/free-trial`;
const EXPECTED_LOGIN_REDIRECT_URL = (() => {
  const url = new URL(`${BASE_URL}/login`);
  url.searchParams.set('redirect', btoa(REQUEST_URL));
  return url.toString();
})();
const OPENCTI_FREE_TRIAL_URL = `${BASE_URL}/app/service/opencti-free-trial`;
const XTM_PLATFORM_TRIAL_URL = `${BASE_URL}${XTM_PLATFORM_TRIAL_PATH}`;

const makeRequest = () => new NextRequest(`${BASE_URL}${REQUEST_URL}`);

type LoadMeUserResult = Awaited<ReturnType<typeof loadMeUser>>;

const baseUser: LoadMeUserResult = {
  id: 'user-1',
  selected_organization_id: 'org-1',
  organizations: [],
  capabilities: [],
  selected_org_capabilities: [],
};

describe('redirectToFreeTrial', () => {
  beforeEach(() => {
    vi.mocked(loadBaseUrlFront).mockResolvedValue(BASE_URL);
    vi.mocked(loadMeUser).mockResolvedValue(baseUser);
    vi.mocked(isFeatureEnabled).mockResolvedValue(false);
  });

  describe('unauthenticated', () => {
    it('redirects to login with redirect param when user is null', async () => {
      vi.mocked(loadMeUser).mockResolvedValue(null);

      const response = await redirectToFreeTrial(makeRequest());

      expect(response.headers.get('location')).toBe(
        EXPECTED_LOGIN_REDIRECT_URL
      );
    });

    it('redirects to login with redirect param when UNAUTHENTICATED error is thrown', async () => {
      vi.mocked(loadMeUser).mockRejectedValue(new Error('UNAUTHENTICATED'));

      const response = await redirectToFreeTrial(makeRequest());

      expect(response.headers.get('location')).toBe(
        EXPECTED_LOGIN_REDIRECT_URL
      );
    });

    it('redirects to /login without redirect param when a generic error is thrown', async () => {
      vi.mocked(loadMeUser).mockRejectedValue(
        new Error('Something went wrong')
      );

      const response = await redirectToFreeTrial(makeRequest());

      expect(response.headers.get('location')).toBe(`${BASE_URL}/login`);
    });
  });

  describe('authenticated', () => {
    it('redirects to opencti-free-trial when the bundle flag is disabled', async () => {
      vi.mocked(isFeatureEnabled).mockResolvedValue(false);

      const response = await redirectToFreeTrial(makeRequest());

      expect(response.headers.get('location')).toBe(OPENCTI_FREE_TRIAL_URL);
    });

    it('redirects to XTM_PLATFORM_TRIAL_PATH when the bundle flag is enabled', async () => {
      vi.mocked(isFeatureEnabled).mockResolvedValue(true);

      const response = await redirectToFreeTrial(makeRequest());

      expect(response.headers.get('location')).toBe(XTM_PLATFORM_TRIAL_URL);
    });
  });
});
