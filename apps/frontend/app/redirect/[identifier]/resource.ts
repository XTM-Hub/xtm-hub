import { getAuthenticatedGraphqlClient } from '@/lib/graphql-client';
import { redirectToSignupOnUnauthenticated } from '@/lib/server-unauthenticated-redirect';
import { isValueInEnum } from '@/utils/is-value-in-enum';
import { loadMeUser } from '@/utils/load-me-user';
import { APP_PATH } from '@/utils/path/constant';
import { encodeRedirectValue } from '@/utils/redirect';
import {
  ServiceDefinitionIdentifier,
  useChangeSelectedOrganizationMutation,
} from '@graphql/generated';
import { NextRequest, NextResponse } from 'next/server';
import {
  loadBaseUrlFront,
  loadPlatformOrganizationId,
  loadServiceInstances,
} from './utils/load';
import { trackNewsFeedRedirect } from './utils/news-feed-telemetry';
import { getLoginRedirectionURL } from './utils/url';

async function switchOrganization(organization_id: string) {
  await redirectToSignupOnUnauthenticated(async () => {
    const client = await getAuthenticatedGraphqlClient();
    return useChangeSelectedOrganizationMutation.fetcher(client, {
      organization_id,
    })();
  });
}
export const redirectToResource = async (
  params: { identifier: string },
  request: NextRequest
) => {
  const baseUrlFront = await loadBaseUrlFront();

  // --------------------------Handle when user is not connected--------------------------
  const user = await loadMeUser();
  if (!user) {
    return NextResponse.redirect(getLoginRedirectionURL(baseUrlFront, request)); // Then the user is connected, we pass again in this function
  }

  // Switch to correct organization
  // (used for 1Click deploy to be on the correct organization following the OpenCTI registered platform)

  // --------------------------Get organizationId--------------------------
  const searchParams = request.nextUrl.searchParams;
  // Old param kept for compatibility (old platform OpenCTI)
  const opencti_platform_id = searchParams.get('opencti_platform_id');
  // Old param kept for compatibility (OpenAEV until 2.4.0)
  const oaev_instance_id = searchParams.get('oaev_instance_id');
  // New param from now
  const platform_id = searchParams.get('platform_id');
  const tenant_id = searchParams.get('tenant_id');
  const document_id = searchParams.get('document_id');

  // Build forwarded params: all params except the internal routing ones
  const internalParams = new Set([
    'opencti_platform_id',
    'oaev_instance_id',
    'platform_id',
    'tenant_id',
    'document_id',
  ]);
  const forwardedParams = new URLSearchParams();
  searchParams.forEach((value, key) => {
    if (!internalParams.has(key)) {
      forwardedParams.append(key, value);
    }
  });
  const queryString = forwardedParams.toString();

  const organizationId: string | undefined = await loadPlatformOrganizationId(
    opencti_platform_id ?? oaev_instance_id ?? platform_id,
    tenant_id
  );

  // --------------------------Switch to the correct organization--------------------------
  const identifier = params.identifier;

  await switchOrganization(organizationId ?? user.selected_organization_id);

  // --------------------------Redirect to correct serviceInstance--------------------------
  if (!isValueInEnum(identifier, ServiceDefinitionIdentifier)) {
    return new Response('Invalid identifier', { status: 400 });
  }

  const serviceInstances = await loadServiceInstances(identifier);

  if (!serviceInstances[0]) {
    return NextResponse.redirect(new URL(`/${APP_PATH}`, baseUrlFront));
  }

  // Final redirect to the resource page: the only place where a news feed click is counted
  trackNewsFeedRedirect(identifier, request);

  const targetPath = `/${APP_PATH}/service/${identifier}/${encodeRedirectValue(serviceInstances[0].id)}${document_id ? `/${encodeRedirectValue(document_id)}` : ''}${queryString ? `?${queryString}` : ''}`;
  return NextResponse.redirect(new URL(targetPath, baseUrlFront));
};
