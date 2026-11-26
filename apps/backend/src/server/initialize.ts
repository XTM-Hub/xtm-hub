import portalConfig from '../config';
import { withTransaction } from '../context/database.context';
import { OrganizationId } from '../model/kanel/public/Organization';
import { RolePortalId } from '../model/kanel/public/RolePortal';
import { UserId } from '../model/kanel/public/User';
import { UserOrganizationDomain } from '../modules/organization-management/user/user-organization/user-organization.domain';
import { UserProvisioningDomain } from '../modules/organization-management/user/user-provisioning/user-provisioning.domain';
import { RolePortalDomain } from '../modules/role-portal/role-portal.domain';
import {
  ADMIN_UUID,
  CAPABILITY_BYPASS,
  PLATFORM_ORGANIZATION_UUID,
  PLATFORM_USER_EMAIL,
  PLATFORM_USER_UUID,
  ROLE_ADMIN,
  ROLE_ADMIN_ORGA,
  ROLE_USER,
  SYSTEM_USER_EMAIL,
  SYSTEM_USER_UUID,
} from '../portal.const';
import { MinIOClient } from '../thirdparty/minio/client';
import { logApp } from '../utils/app-logger.util';
import {
  ensureCapabilityExists,
  ensurePersonalSpaceExist,
  ensureRoleExists,
  ensureRoleHasCapability,
  initializeDevUsers,
  insertPlatformOrganization,
  insertUserAdminOrganization,
} from './initialize.helper';

const initializeUser = async ({
  userId,
  email,
  password,
  roleId,
}: {
  userId: UserId;
  email: string;
  password: string;
  roleId?: RolePortalId;
}) => {
  await withTransaction(async () => {
    await insertPlatformOrganization();

    const { created } = await UserProvisioningDomain.createOrRefreshUser(
      {
        id: userId,
        email,
        first_name: null,
        last_name: null,
        picture: null,
        selected_organization_id: PLATFORM_ORGANIZATION_UUID,
      },
      { password }
    );

    if (created) {
      await completeUserOrganizationSetup(userId, email);
    }
  });

  if (roleId) {
    await RolePortalDomain.ensureUserHasRole(userId, roleId);
  }

  await ensurePersonalSpaceExist(userId, email);
};

const initAdminUser = () =>
  initializeUser({
    userId: ADMIN_UUID,
    email: portalConfig.admin.email,
    password: portalConfig.admin.password,
    roleId: ROLE_ADMIN.id,
  });

const initSystemUser = () =>
  initializeUser({
    userId: SYSTEM_USER_UUID,
    email: SYSTEM_USER_EMAIL,
    password: portalConfig.admin.password,
    roleId: ROLE_ADMIN.id,
  });

const initPlatformUser = () =>
  initializeUser({
    userId: PLATFORM_USER_UUID,
    email: PLATFORM_USER_EMAIL,
    password: portalConfig.admin.password,
  });

const completeUserOrganizationSetup = async (
  user_id: UserId,
  email: string
) => {
  await withTransaction(async () => {
    await insertUserAdminOrganization(user_id, email);

    await UserOrganizationDomain.ensureUserOrganizationExists(
      user_id,
      PLATFORM_ORGANIZATION_UUID
    );
    await UserOrganizationDomain.ensureUserOrganizationExists(
      user_id,
      user_id as unknown as OrganizationId
    );
  });
};

const initCapabilityAndRole = async () => {
  await withTransaction(async () => {
    await ensureCapabilityExists(CAPABILITY_BYPASS);
    await ensureRoleExists(ROLE_ADMIN);
    await ensureRoleExists(ROLE_USER);
    await ensureRoleExists(ROLE_ADMIN_ORGA);
    // Ensure ROLE_ADMIN has CAPABILITY_BYPASS
    await ensureRoleHasCapability(ROLE_ADMIN, CAPABILITY_BYPASS);
  });
};

const initializeBuiltInAdministrator = async () => {
  // Initialize default Role and Capability
  await initCapabilityAndRole();
  // Initialize default admin user
  await initAdminUser();
  // Initialize system user
  await initSystemUser();
  // Initialize platform user
  await initPlatformUser();
};

const logEnabledFeatureFlags = () => {
  if (portalConfig.enabled_features.length > 0) {
    logApp.info(
      `[FEATURE-FLAG] Enabled features still in development: ${portalConfig.enabled_features}`
    );
  }
};

const platformInit = async () => {
  logEnabledFeatureFlags();
  await initializeBuiltInAdministrator();
  await initializeDevUsers();
};

export const minioInit = async () => {
  await MinIOClient.initializeBucket();
};

export default platformInit;
