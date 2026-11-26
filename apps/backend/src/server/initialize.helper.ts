import { v4 as uuidv4 } from 'uuid';
import { db } from '../../knexfile';
import {
  DocumentMetadataKeyCode,
  IntegrationType,
  OrganizationCapability,
} from '../__generated__/resolvers-types';
import portalConfig from '../config';
import { withTransaction } from '../context/database.context';
import { requestContext } from '../context/request.context';
import CapabilityPortal from '../model/kanel/public/CapabilityPortal';
import Document from '../model/kanel/public/Document';
import Organization, {
  OrganizationId,
} from '../model/kanel/public/Organization';
import RolePortal from '../model/kanel/public/RolePortal';
import RolePortalCapabilityPortal from '../model/kanel/public/RolePortalCapabilityPortal';
import { UserId } from '../model/kanel/public/User';
import { UserOrganizationId } from '../model/kanel/public/UserOrganization';
import UserOrganizationCapability from '../model/kanel/public/UserOrganizationCapability';
import { OrganizationDomain } from '../modules/organization-management/organization/organization.domain';
import { UserDomain } from '../modules/organization-management/user/user-domain/user.domain';
import { UserOrganizationDomain } from '../modules/organization-management/user/user-organization/user-organization.domain';
import { UserProvisioningDomain } from '../modules/organization-management/user/user-provisioning/user-provisioning.domain';
import { RolePortalDomain } from '../modules/role-portal/role-portal.domain';
import { IngestManifestApp } from '../modules/shareable-resource/opencti/integration/ingest-manifest/ingest-manifest.app';
import {
  ADMIN_UUID,
  PLATFORM_DOMAIN,
  PLATFORM_NAME,
  PLATFORM_ORGANIZATION_UUID,
  ROLE_ADMIN,
  ROLE_ADMIN_ORGA,
  ROLE_USER,
} from '../portal.const';
import { logApp } from '../utils/app-logger.util';
import { DevUser } from '../utils/config-validation.util';
import { getErrorMessage } from '../utils/error/error-guard.util';
import { UnknownErrorCode } from '../utils/error/error.code';

// Role mapping for dev user initialization
const ROLE_MAPPING: { [key: string]: string } = {
  ADMIN: ROLE_ADMIN.id,
  USER: ROLE_USER.id,
  ADMIN_ORGA: ROLE_ADMIN_ORGA.id,
};

type InitEntityWithId = { id: string };

export const ensureCapabilityExists = async (capability: CapabilityPortal) => {
  const capabilityPortal = await db('CapabilityPortal');
  if (!capabilityPortal.find((c: CapabilityPortal) => c.id === capability.id)) {
    await db<CapabilityPortal>('CapabilityPortal').insert(capability);
  }
};

export const ensureRoleExists = async (role: InitEntityWithId) => {
  const rolePortal = await db('RolePortal');
  if (!rolePortal.find((r: { id: string }) => r.id === role.id)) {
    await db<RolePortal>('RolePortal').insert(role as unknown as RolePortal);
  }
};

export const ensureRoleHasCapability = async (
  role: RolePortal,
  capability: CapabilityPortal
) => {
  const roleCapability = await db<RolePortalCapabilityPortal>(
    'RolePortal_CapabilityPortal'
  )
    .where('capability_portal_id', capability.id)
    .andWhere('role_portal_id', role.id)
    .first();

  if (!roleCapability) {
    await db<RolePortalCapabilityPortal>('RolePortal_CapabilityPortal').insert({
      capability_portal_id:
        capability.id as RolePortalCapabilityPortal['capability_portal_id'],
      role_portal_id: role.id as RolePortalCapabilityPortal['role_portal_id'],
    });
  }
};

export const insertPlatformOrganization = async () => {
  const adminOrganization = await OrganizationDomain.loadOrganizationBy({
    id: PLATFORM_ORGANIZATION_UUID,
  });

  if (!adminOrganization) {
    await OrganizationDomain.insertNewOrganization({
      id: PLATFORM_ORGANIZATION_UUID as OrganizationId,
      name: PLATFORM_NAME,
      domains: PLATFORM_DOMAIN,
    });
  }
};

export const insertUserAdminOrganization = async (
  user_id: UserId,
  email: string
) => {
  const adminOrganization = await OrganizationDomain.loadOrganizationBy({
    id: user_id as unknown as OrganizationId,
  });

  if (!adminOrganization) {
    await OrganizationDomain.insertNewOrganization({
      id: user_id as unknown as OrganizationId,
      name: email,
      personal_space: true,
    });
  }
};

export const ensurePersonalSpaceExist = async (
  user_id: UserId,
  mail: string
) => {
  const orgId = user_id as unknown as OrganizationId;

  await ensureOrganizationExists(orgId, mail);
  const userOrg = await UserOrganizationDomain.ensureUserOrganizationExists(
    user_id,
    orgId
  );
  await ensureCapabilitiesExist(userOrg.id, [
    OrganizationCapability.AdministrateOrganization,
  ]);
};

const ensureOrganizationExists = async (
  orgId: OrganizationId,
  mail: string
) => {
  const personalSpace = await OrganizationDomain.loadOrganizationBy({
    id: orgId,
  });

  if (!personalSpace) {
    await OrganizationDomain.insertNewOrganization({
      id: orgId,
      name: mail,
      personal_space: true,
    });
  }
};

const ensureCapabilitiesExist = async (
  userOrgId: UserOrganizationId,
  capabilities: string[]
) => {
  for (const capability of capabilities) {
    const existingCapability = await db<UserOrganizationCapability>(
      'UserOrganization_Capability'
    )
      .where({ user_organization_id: userOrgId, name: capability })
      .first();

    if (!existingCapability) {
      await db<UserOrganizationCapability>(
        'UserOrganization_Capability'
      ).insert({ user_organization_id: userOrgId, name: capability });
    }
  }
};

/**
 * Creates or updates a development organization from config
 */
export const ensureDevOrganizationExists = async (orgConfig: {
  name: string;
  domains?: string[];
}): Promise<Organization> => {
  // Check if organization already exists by name
  const existingOrg = await OrganizationDomain.loadOrganizationBy({
    name: orgConfig.name,
    personal_space: false,
  });

  if (existingOrg) {
    // Update domains if provided
    if (orgConfig.domains && orgConfig.domains.length > 0) {
      const updatedOrg = await OrganizationDomain.updateOrganizationBy(
        { id: existingOrg.id },
        { domains: orgConfig.domains }
      );
      if (!updatedOrg) {
        throw new Error(UnknownErrorCode.EditOrganizationError);
      }
      return updatedOrg;
    }
    return existingOrg;
  }

  // Create new organization
  const newOrg = await OrganizationDomain.insertNewOrganization({
    id: uuidv4() as OrganizationId,
    name: orgConfig.name,
    domains: orgConfig.domains || [],
    personal_space: false,
  });

  return newOrg;
};

/**
 * Creates or updates a development user
 */
export const ensureDevUserExists = async (
  userConfig: DevUser
): Promise<void> => {
  try {
    await withTransaction(async () => {
      let orgId: OrganizationId | undefined;
      if (userConfig.organization) {
        const org = await ensureDevOrganizationExists({
          name: userConfig.organization.name,
          domains: userConfig.organization.domains,
        });
        orgId = org.id;
      }

      const { user, created } =
        await UserProvisioningDomain.createOrRefreshUser(
          {
            email: userConfig.email,
            first_name: null,
            last_name: null,
            picture: null,
            selected_organization_id: orgId ?? PLATFORM_ORGANIZATION_UUID,
          },
          { password: userConfig.password }
        );
      const userId = user.id;

      logApp.info(
        `${created ? 'Created' : 'Updated'} dev user: ${userConfig.email}`
      );

      if (orgId) {
        await UserOrganizationDomain.ensureUserOrganizationExists(
          userId,
          orgId
        );
      }

      // Always ensure platform organization membership
      await UserOrganizationDomain.ensureUserOrganizationExists(
        userId,
        PLATFORM_ORGANIZATION_UUID
      );

      // Handle roles
      const roles = userConfig.roles || ['USER'];
      for (const roleName of roles) {
        const roleId = ROLE_MAPPING[roleName];
        if (!roleId) {
          logApp.warn(
            `Role '${roleName}' is not recognized and will be skipped for user ${userConfig.email}`
          );
          continue;
        }

        await RolePortalDomain.ensureUserHasRole(userId, roleId);
      }

      // Always create personal space
      await ensurePersonalSpaceExist(userId, userConfig.email);
    });
  } catch (error) {
    logApp.error(
      `Failed to initialize dev user ${userConfig.email}: ${getErrorMessage(error)}`
    );
    throw error;
  }
};

/**
 * Initialize all development users from configuration
 */
export const initializeDevUsers = async (): Promise<void> => {
  if (!portalConfig.dev_users || portalConfig.dev_users.length === 0) {
    return; // No dev users to initialize
  }

  logApp.info(
    `Initializing ${portalConfig.dev_users.length} development users`
  );

  for (const userConfig of portalConfig.dev_users) {
    try {
      await ensureDevUserExists(userConfig);
    } catch (error) {
      logApp.warn(
        `Failed to initialize dev user ${userConfig.email}: ${getErrorMessage(error)}`
      );
      // Continue with other users
    }
  }

  logApp.info('Development users initialization completed');
};

/**
 * Ingest fixed connectors manifest for development environment.
 */
export const seedDevelopmentConnectors = async () => {
  const areConnectorsSeeded = await db<Document>('Document_Metadata')
    .where('key', '=', DocumentMetadataKeyCode.IntegrationType)
    .andWhere('value', '=', IntegrationType.Connector)
    .first();

  if (areConnectorsSeeded) {
    logApp.info('[SEEDING] OpenCTI connectors already seeded');

    return;
  }

  logApp.info('[SEEDING] Ingesting OpenCTI connectors manifest...');
  const user = await UserDomain.loadUserBy({ 'User.id': ADMIN_UUID });
  if (!user) {
    logApp.error(
      '[SEEDING] Admin user not found, skipping OpenCTI connectors seeding'
    );
    return;
  }
  await requestContext.run({ user }, async () => {
    await IngestManifestApp.updateOpenCTIManifest('6.8.3');
  });
  logApp.info('[SEEDING] OpenCTI connectors seeding completed');
};
