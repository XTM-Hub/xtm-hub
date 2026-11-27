'use client';
import GuardCapacityComponent from '@/components/AdminGuard';
import { PortalCapability } from '@graphql/generated';
import PageLoader from './page-loader';

// Component
const Page = () => {
  return (
    <GuardCapacityComponent
      displayError
      portalCapabilityRestriction={[PortalCapability.ReadOrganizationMembers]}>
      <PageLoader />
    </GuardCapacityComponent>
  );
};

// Component export
export default Page;
