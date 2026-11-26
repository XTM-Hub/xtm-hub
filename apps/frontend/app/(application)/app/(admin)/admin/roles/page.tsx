'use client';
import GuardCapacityComponent from '@/components/AdminGuard';
import RoleList from '@/components/admin/role/RoleList';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { PortalCapability } from '@graphql/generated';

const breadcrumbValue = [
  {
    label: 'MenuLinks.Settings',
  },
  {
    label: 'MenuLinks.Roles',
  },
];

const Page = () => {
  return (
    <GuardCapacityComponent
      portalCapabilityRestriction={[PortalCapability.Bypass]}
      displayError>
      <BreadcrumbNav value={breadcrumbValue} />
      <RoleList />
    </GuardCapacityComponent>
  );
};

export default Page;
