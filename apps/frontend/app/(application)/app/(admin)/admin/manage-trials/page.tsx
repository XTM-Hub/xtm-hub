'use client';
import GuardCapacityComponent from '@/components/AdminGuard';
import { PortalCapability } from '@graphql/generated';
import PageLoader from './page-loader';

const Page = () => {
  return (
    <GuardCapacityComponent
      portalCapabilityRestriction={[PortalCapability.ReadTrials]}
      displayError>
      <PageLoader />
    </GuardCapacityComponent>
  );
};

export default Page;
