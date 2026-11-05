import { loadMeUser } from '@/utils/load-me-user';
import { APP_PATH } from '@/utils/path/constant';
import { registeredPlatformDetailPath } from '@/utils/path/registered-platform-detail-path';
import { encodeRedirectValue } from '@/utils/redirect';
import { PlatformIdentifier } from '@graphql/generated';
import { NextRequest, NextResponse } from 'next/server';
import {
  loadBaseUrlFront,
  loadPlatformOrganizationId,
  loadRegisteredPlatformRedirectTargets,
} from './utils/load';
import { switchOrganization } from './utils/switch-organization';
import { getLoginRedirectionURL } from './utils/url';

/**
 * A platform knows only its own platform id, while its registration page is keyed by its service instance: this
 * resolves one into the other, in the organization the platform is registered in, and falls back to the Hub home
 * page when the user cannot see the registration.
 */
export const redirectToRegisteredPlatform = async (
  request: NextRequest,
  identifier: PlatformIdentifier
) => {
  const baseUrlFront = await loadBaseUrlFront();

  const user = await loadMeUser();
  if (!user) {
    return NextResponse.redirect(getLoginRedirectionURL(baseUrlFront, request));
  }

  const homeUrl = new URL(`/${APP_PATH}`, baseUrlFront);
  const platformId = request.nextUrl.searchParams.get('platform_id');
  if (!platformId) {
    return NextResponse.redirect(homeUrl);
  }
  const tenantId = request.nextUrl.searchParams.get('tenant_id');

  const organizationId = await loadPlatformOrganizationId(platformId, tenantId);
  if (organizationId && organizationId !== user.selected_organization_id) {
    await switchOrganization(organizationId);
  }

  const platforms = await loadRegisteredPlatformRedirectTargets(identifier);
  const platform = platforms.find(
    (registeredPlatform) =>
      registeredPlatform.platform_id === platformId &&
      (!tenantId || registeredPlatform.tenant_id === tenantId)
  );
  const detailPath =
    platform &&
    registeredPlatformDetailPath({
      identifier: platform.identifier,
      deploymentRequest: platform.deployment_request,
      serviceInstanceId: encodeRedirectValue(platform.service_instance_id),
    });

  return NextResponse.redirect(
    detailPath ? new URL(detailPath, baseUrlFront) : homeUrl
  );
};
