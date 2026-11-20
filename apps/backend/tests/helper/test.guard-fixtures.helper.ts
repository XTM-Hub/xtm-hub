import {
  OrganizationCapability,
  PortalCapability,
} from '../../src/__generated__/resolvers-types';
import type DeploymentRequest from '../../src/model/kanel/public/DeploymentRequest';
import Organization, {
  OrganizationId,
} from '../../src/model/kanel/public/Organization';
import { UserId } from '../../src/model/kanel/public/User';
import { OrganizationHelper } from '../../src/modules/organization-management/organization/organization.helper';
import type { FullPlatformConfiguration } from '../../src/modules/registration/platform-configuration/platform-configuration.domain';
import { PLATFORM_USER_UUID, SYSTEM_USER_UUID } from '../../src/portal.const';
import { Principal } from '../../src/security/guarded/principal';

const USER_ID = 'user-id' as UserId;
const ORGANIZATION_ID = 'organization-id' as OrganizationId;
const OTHER_ORGANIZATION_ID = 'other-organization-id' as OrganizationId;
const PERSONAL_SPACE_ID = OrganizationHelper.personalSpaceIdOf({
  id: USER_ID,
});

const buildUserPrincipal = (
  overrides: {
    isBypassUser?: boolean;
    capabilities?: PortalCapability[];
    selectedOrganizationId?: OrganizationId;
    memberships?: Record<string, OrganizationCapability[]>;
  } = {}
): Principal => ({
  kind: 'user',
  actorId: USER_ID,
  isBypassUser: overrides.isBypassUser ?? false,
  portalCapabilities: new Set(overrides.capabilities ?? []),
  selectedOrganizationId: overrides.selectedOrganizationId ?? ORGANIZATION_ID,
  memberships: Object.entries(overrides.memberships ?? {}).map(
    ([organizationId, capabilities]) => ({
      id: organizationId,
      organization: { id: organizationId as OrganizationId } as Organization,
      capabilities,
    })
  ),
});

const ANONYMOUS: Principal = { kind: 'anonymous' };

const buildSystemPrincipal = (
  capabilities: PortalCapability[] = []
): Principal => ({
  kind: 'system',
  actorId: SYSTEM_USER_UUID,
  portalCapabilities: new Set(capabilities),
});

const PLATFORM_ID = 'platform-id';

const buildRegistrationPlatformPrincipal = (): Principal => ({
  kind: 'platform',
  actorId: PLATFORM_USER_UUID,
  platformId: PLATFORM_ID,
  organization: { id: ORGANIZATION_ID } as Organization,
  credential: 'registration',
  registration: {} as FullPlatformConfiguration,
});

const buildDeploymentRequestPlatformPrincipal = (): Principal => ({
  kind: 'platform',
  actorId: PLATFORM_USER_UUID,
  platformId: PLATFORM_ID,
  organization: { id: ORGANIZATION_ID } as Organization,
  credential: 'deploymentRequest',
  deploymentRequest: {} as DeploymentRequest,
});

// In-memory principals and ids shared by the guard unit tests
export const TestGuardFixturesHelper = {
  guardFixtures: {
    USER_ID,
    ORGANIZATION_ID,
    OTHER_ORGANIZATION_ID,
    PERSONAL_SPACE_ID,
    PLATFORM_ID,
    ANONYMOUS,
    buildUserPrincipal,
    buildSystemPrincipal,
    buildRegistrationPlatformPrincipal,
    buildDeploymentRequestPlatformPrincipal,
  },
};
