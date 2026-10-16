import { OrganizationCapability } from '../__generated__/resolvers-types';
import CapabilityPortal from './kanel/public/CapabilityPortal';
import Organization from './kanel/public/Organization';
import RolePortal from './kanel/public/RolePortal';
import User from './kanel/public/User';

export interface UserInfo {
  email: string;
  first_name: string;
  last_name: string;
  roles: string[];
  picture?: string;
  disabled?: boolean;
}

export interface ProviderUserInfo extends UserInfo {
  idp_subject: string;
}

export interface UserWithOrganizations extends User {
  organizations: Organization[];
  selected_org_capabilities: OrganizationCapability[];
}

export interface UserWithOrganizationsAndRole extends UserWithOrganizations {
  roles_portal: RolePortal[];
}

export interface UserLoadUserBy extends UserWithOrganizationsAndRole {
  capabilities: CapabilityPortal[];
  organization_capabilities?: {
    id: string;
    organization: Organization;
    capabilities: OrganizationCapability[];
  }[];
}
