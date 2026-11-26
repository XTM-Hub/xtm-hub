import {
  INTERNAL_EMAIL_DOMAIN,
  USER_PROPERTIES_WAIT_MS,
} from '@/lib/analytics/analytics.consts';
import { type AnalyticsUserProperties } from '@/lib/analytics/analytics.types';
import { getQueryClient } from '@/lib/query-client';
import {
  type MeAnalyticsQuery,
  OrganizationCapability,
  PortalCapability,
} from '@graphql/generated';
import { meAnalyticsKeys } from '@graphql/me/me.keys';

const SIGNED_OUT_USER_PROPERTIES: AnalyticsUserProperties = {
  auth_state: 'Signed out',
  is_internal: null,
  organization_type: null,
  is_platform_admin: null,
  organization_role: null,
};

type AnalyticsUser = NonNullable<MeAnalyticsQuery['me']>;

const toOrganizationType = (
  user: AnalyticsUser
): AnalyticsUserProperties['organization_type'] => {
  const organization = user.organizations?.find(
    ({ id }) => id === user.selected_organization_id
  );
  if (!organization) {
    return null;
  }
  return organization.personal_space ? 'Personal space' : 'Organization';
};

export const toAnalyticsUserProperties = (
  user: MeAnalyticsQuery['me']
): AnalyticsUserProperties =>
  user
    ? {
        auth_state: 'Signed in',
        is_internal: user.email
          .toLowerCase()
          .endsWith(`@${INTERNAL_EMAIL_DOMAIN}`)
          ? 'Yes'
          : 'No',
        organization_type: toOrganizationType(user),
        is_platform_admin: user.capabilities?.some(
          ({ name }) => name === PortalCapability.Bypass
        )
          ? 'Yes'
          : 'No',
        organization_role: user.selected_org_capabilities?.includes(
          OrganizationCapability.AdministrateOrganization
        )
          ? 'Administrator'
          : 'Member',
      }
    : SIGNED_OUT_USER_PROPERTIES;

export const refreshAnalyticsUser = (): Promise<void> =>
  Promise.race([
    getQueryClient().invalidateQueries({ queryKey: meAnalyticsKeys.detail() }),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, USER_PROPERTIES_WAIT_MS);
    }),
  ]);
