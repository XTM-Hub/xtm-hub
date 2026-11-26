import { getAuthenticatedGraphqlClient } from '@/lib/graphql-client';
import { loadMeUser } from '@/utils/load-me-user';
import { OrganizationCapability } from '@graphql/generated';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redirectToHandlePendingUser } from './handle-pending-user';
import { loadBaseUrlFront } from './utils/load';

const changeSelectedOrganizationFetcher = vi.fn();

vi.mock('./utils/load');
vi.mock('../../../src/utils/load-me-user');
vi.mock('../../../src/lib/graphql-client', () => ({
  getAuthenticatedGraphqlClient: vi.fn(),
}));
vi.mock('@graphql/generated', async (importOriginal) => {
  const original = await importOriginal<typeof import('@graphql/generated')>();
  return {
    ...original,
    useChangeSelectedOrganizationMutation: {
      fetcher: (...args: unknown[]) =>
        changeSelectedOrganizationFetcher(...args),
    },
  };
});

const BASE_URL = 'http://localhost:3002';
const ORGANIZATION_ID = 'organization-1';
const USER_ID = 'user-2';
const PENDING_USERS_URL = `${BASE_URL}/app/manage/user`;
const APP_URL = `${BASE_URL}/app`;

const buildPath = (search: string) =>
  `/redirect/handle-pending-user${search ? `?${search}` : ''}`;

const makeRequest = (search: string) =>
  new NextRequest(`${BASE_URL}${buildPath(search)}`);

const validSearch = `action=approve&organization_id=${ORGANIZATION_ID}&user_id=${USER_ID}`;

type LoadMeUserResult = Awaited<ReturnType<typeof loadMeUser>>;

const baseUser: LoadMeUserResult = {
  id: 'user-1',
  selected_organization_id: 'other-organization',
  organizations: [],
  capabilities: [],
  selected_org_capabilities: [],
};

const mockOrganizationSwitch = (capabilities: OrganizationCapability[]) => {
  changeSelectedOrganizationFetcher.mockReturnValue(() =>
    Promise.resolve({
      changeSelectedOrganization: {
        id: baseUser!.id,
        selected_organization_id: ORGANIZATION_ID,
        selected_org_capabilities: capabilities,
      },
    })
  );
};

describe('redirectToHandlePendingUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadBaseUrlFront).mockResolvedValue(BASE_URL);
    vi.mocked(loadMeUser).mockResolvedValue(baseUser);
    vi.mocked(getAuthenticatedGraphqlClient).mockResolvedValue(
      {} as Awaited<ReturnType<typeof getAuthenticatedGraphqlClient>>
    );
    mockOrganizationSwitch([OrganizationCapability.AdministrateOrganization]);
  });

  describe('invalid query params', () => {
    it.each`
      search                                                                | description
      ${`action=foo&organization_id=${ORGANIZATION_ID}&user_id=${USER_ID}`} | ${'unsupported action'}
      ${`organization_id=${ORGANIZATION_ID}&user_id=${USER_ID}`}            | ${'missing action'}
      ${`action=approve&user_id=${USER_ID}`}                                | ${'missing organization_id'}
      ${`action=approve&organization_id=${ORGANIZATION_ID}`}                | ${'missing user_id'}
      ${`action=approve&organization_id=&user_id=${USER_ID}`}               | ${'empty organization_id'}
      ${`action=approve&organization_id=${ORGANIZATION_ID}&user_id=`}       | ${'empty user_id'}
      ${''}                                                                 | ${'no query param at all'}
    `(
      'redirects to /app when $description',
      async ({ search }: { search: string }) => {
        const response = await redirectToHandlePendingUser(makeRequest(search));

        expect(response.headers.get('location')).toBe(APP_URL);
        expect(loadMeUser).not.toHaveBeenCalled();
        expect(changeSelectedOrganizationFetcher).not.toHaveBeenCalled();
      }
    );
  });

  describe('unauthenticated', () => {
    it('redirects to login with redirect param when user is null', async () => {
      vi.mocked(loadMeUser).mockResolvedValue(null);

      const response = await redirectToHandlePendingUser(
        makeRequest(validSearch)
      );

      expect(response.headers.get('location')).toBe(
        `${BASE_URL}/login?redirect=${encodeURIComponent(btoa(buildPath(validSearch)))}`
      );
      expect(changeSelectedOrganizationFetcher).not.toHaveBeenCalled();
    });

    it('redirects to login with redirect param when UNAUTHENTICATED error is thrown', async () => {
      vi.mocked(loadMeUser).mockRejectedValue(new Error('UNAUTHENTICATED'));

      const response = await redirectToHandlePendingUser(
        makeRequest(validSearch)
      );

      expect(response.headers.get('location')).toBe(
        `${BASE_URL}/login?redirect=${encodeURIComponent(btoa(buildPath(validSearch)))}`
      );
    });

    it('redirects to /login without redirect param when a generic error is thrown', async () => {
      vi.mocked(loadMeUser).mockRejectedValue(new Error('Something failed'));

      const response = await redirectToHandlePendingUser(
        makeRequest(validSearch)
      );

      expect(response.headers.get('location')).toBe(`${BASE_URL}/login`);
    });
  });

  describe('organization switch', () => {
    it('redirects to /app with the unauthorized error when changeSelectedOrganization fails', async () => {
      changeSelectedOrganizationFetcher.mockReturnValue(() =>
        Promise.reject(new Error('USER_NOT_IN_ORGANIZATION'))
      );

      const response = await redirectToHandlePendingUser(
        makeRequest(validSearch)
      );

      expect(response.headers.get('location')).toBe(
        `${APP_URL}?error=pending_user_unauthorized`
      );
    });

    it('switches the selected organization with the id from the query string', async () => {
      await redirectToHandlePendingUser(makeRequest(validSearch));

      expect(changeSelectedOrganizationFetcher).toHaveBeenCalledWith(
        expect.anything(),
        { organization_id: ORGANIZATION_ID }
      );
    });
  });

  describe('capabilities', () => {
    it.each`
      capabilities                                         | description
      ${[OrganizationCapability.AdministrateOrganization]} | ${'ADMINISTRATE_ORGANIZATION'}
      ${[OrganizationCapability.ManageAccess]}             | ${'MANAGE_ACCESS'}
    `(
      'forwards to the pending users page when the user has $description',
      async ({ capabilities }: { capabilities: OrganizationCapability[] }) => {
        mockOrganizationSwitch(capabilities);

        const response = await redirectToHandlePendingUser(
          makeRequest(validSearch)
        );

        expect(response.headers.get('location')).toBe(
          `${PENDING_USERS_URL}?action=approve&user_id=${USER_ID}`
        );
      }
    );

    it.each`
      capabilities                                   | description
      ${[]}                                          | ${'no capability'}
      ${[OrganizationCapability.ManageSubscription]} | ${'only unrelated capabilities'}
    `(
      'redirects to /app with the unauthorized error when the user has $description',
      async ({ capabilities }: { capabilities: OrganizationCapability[] }) => {
        mockOrganizationSwitch(capabilities);

        const response = await redirectToHandlePendingUser(
          makeRequest(validSearch)
        );

        expect(response.headers.get('location')).toBe(
          `${APP_URL}?error=pending_user_unauthorized`
        );
      }
    );
  });

  describe('forwarding', () => {
    it.each`
      action
      ${'approve'}
      ${'deny'}
    `(
      'forwards action=$action and the user id to the pending users page',
      async ({ action }: { action: string }) => {
        const response = await redirectToHandlePendingUser(
          makeRequest(
            `action=${action}&organization_id=${ORGANIZATION_ID}&user_id=${USER_ID}`
          )
        );

        expect(response.headers.get('location')).toBe(
          `${PENDING_USERS_URL}?action=${action}&user_id=${USER_ID}`
        );
      }
    );
  });
});
