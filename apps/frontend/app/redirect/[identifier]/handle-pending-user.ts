import { PendingUserAction } from '@/components/admin/user/pending-user/pending-user-list.types';
import { PENDING_USER_UNAUTHORIZED_ERROR } from '@/components/homepage/pending-user-redirect-error.constants';
import { getAuthenticatedGraphqlClient } from '@/lib/graphql-client';
import { loadMeUser } from '@/utils/load-me-user';
import {
  OrganizationCapability,
  useChangeSelectedOrganizationMutation,
} from '@graphql/generated';
import { NextRequest, NextResponse } from 'next/server';
import { loadBaseUrlFront } from './utils/load';
import { getLoginRedirectionURL } from './utils/url';

const PENDING_USERS_PATH = '/app/manage/user';
const APP_PATH = '/app';

const REQUIRED_CAPABILITIES: OrganizationCapability[] = [
  OrganizationCapability.AdministrateOrganization,
  OrganizationCapability.ManageAccess,
];

const parsePendingUserAction = (
  action: string | null
): PendingUserAction | null =>
  action === 'approve' || action === 'deny' ? action : null;

export const redirectToHandlePendingUser = async (request: NextRequest) => {
  const baseUrlFront = await loadBaseUrlFront();
  const loginUrl = getLoginRedirectionURL(baseUrlFront, request);
  const appUrl = new URL(APP_PATH, baseUrlFront);
  const unauthorizedUrl = new URL(APP_PATH, baseUrlFront);
  unauthorizedUrl.searchParams.set('error', PENDING_USER_UNAUTHORIZED_ERROR);

  try {
    const searchParams = new URL(request.url).searchParams;
    const action = parsePendingUserAction(searchParams.get('action'));
    const organizationId = searchParams.get('organization_id');
    const userId = searchParams.get('user_id');

    if (!action || !organizationId || !userId) {
      return NextResponse.redirect(appUrl);
    }

    const user = await loadMeUser();
    if (!user) {
      return NextResponse.redirect(loginUrl);
    }

    const client = await getAuthenticatedGraphqlClient();
    const capabilities = await useChangeSelectedOrganizationMutation
      .fetcher(client, { organization_id: organizationId })()
      .then(
        (data) =>
          data.changeSelectedOrganization?.selected_org_capabilities ?? []
      )
      .catch(() => null);

    const userIsAllowed = REQUIRED_CAPABILITIES.some((capability) =>
      capabilities?.includes(capability)
    );
    if (!userIsAllowed) {
      return NextResponse.redirect(unauthorizedUrl);
    }

    const pendingUsersUrl = new URL(PENDING_USERS_PATH, baseUrlFront);
    pendingUsersUrl.searchParams.set('action', action);
    pendingUsersUrl.searchParams.set('user_id', userId);
    return NextResponse.redirect(pendingUsersUrl);
  } catch (error) {
    if ((error as Error).message === 'UNAUTHENTICATED') {
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.redirect(new URL('/login', baseUrlFront));
  }
};
