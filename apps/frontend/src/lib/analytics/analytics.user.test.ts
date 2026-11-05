import { toAnalyticsUserProperties } from '@/lib/analytics/analytics.user';
import {
  type MeAnalyticsQuery,
  OrganizationCapability,
  PortalCapability,
} from '@graphql/generated';
import { describe, expect, it } from 'vitest';

type AnalyticsUser = NonNullable<MeAnalyticsQuery['me']>;

const PERSONAL_SPACE_ID = 'personal-space-id';
const ORGANIZATION_ID = 'organization-id';

const makeUser = (overrides: Partial<AnalyticsUser> = {}): AnalyticsUser => ({
  email: 'jane@acme.com',
  selected_organization_id: ORGANIZATION_ID,
  organizations: [
    { id: PERSONAL_SPACE_ID, personal_space: true },
    { id: ORGANIZATION_ID, personal_space: false },
  ],
  capabilities: [],
  selected_org_capabilities: [],
  ...overrides,
});

describe('toAnalyticsUserProperties', () => {
  it.each([
    ['Yes', 'jane@filigran.io'],
    ['Yes', 'Jane@Filigran.IO'],
    ['No', 'jane@notfiligran.io'],
    ['No', 'jane@filigran.io.example.com'],
  ])(
    'should set is_internal to %s when the e-mail is %s',
    (isInternal, email) => {
      // Given / When
      const properties = toAnalyticsUserProperties(makeUser({ email }));

      // Then
      expect(properties.is_internal).toBe(isInternal);
    }
  );

  it.each([
    [PERSONAL_SPACE_ID, 'Personal space'],
    [ORGANIZATION_ID, 'Organization'],
    [null, null],
  ])(
    'should set the organization type when the selected organization is %s',
    (selectedOrganizationId, organizationType) => {
      // Given / When
      const properties = toAnalyticsUserProperties(
        makeUser({ selected_organization_id: selectedOrganizationId })
      );

      // Then
      expect(properties.organization_type).toBe(organizationType);
    }
  );

  it.each([
    ['Yes', [{ name: PortalCapability.Bypass }]],
    ['No', [{ name: PortalCapability.ReadTrials }]],
  ])(
    'should set is_platform_admin to %s when the portal capabilities are %j',
    (isPlatformAdmin, capabilities) => {
      // Given / When
      const properties = toAnalyticsUserProperties(makeUser({ capabilities }));

      // Then
      expect(properties.is_platform_admin).toBe(isPlatformAdmin);
    }
  );

  it.each([
    ['Administrator', [OrganizationCapability.AdministrateOrganization]],
    ['Member', [OrganizationCapability.ManageAccess]],
  ])(
    'should set organization_role to %s when the capabilities on the selected organization are %j',
    (organizationRole, selectedOrgCapabilities) => {
      // Given / When
      const properties = toAnalyticsUserProperties(
        makeUser({ selected_org_capabilities: selectedOrgCapabilities })
      );

      // Then
      expect(properties.organization_role).toBe(organizationRole);
    }
  );

  it('should only send the signed-out auth state when the visitor is anonymous', () => {
    // Given / When
    const properties = toAnalyticsUserProperties(null);

    // Then
    expect(properties).toEqual({
      auth_state: 'Signed out',
      is_internal: null,
      organization_type: null,
      is_platform_admin: null,
      organization_role: null,
    });
  });

  it('should set the auth state to Signed in when the visitor is signed in', () => {
    // Given / When
    const properties = toAnalyticsUserProperties(makeUser());

    // Then
    expect(properties.auth_state).toBe('Signed in');
  });
});
