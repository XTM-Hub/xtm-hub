import GuardCapacityComponent from '@/components/AdminGuard';
import {
  MANAGE_USERS_ORIGIN_DASHBOARD,
  MANAGE_USERS_ORIGIN_PARAM,
} from '@/utils/path/constant';
import { isFeatureEnabled } from '@/utils/settings.service';
import { FeatureFlag, OrganizationCapability } from '@graphql/generated';
import { notFound } from 'next/navigation';
import ClientSection from './client-section';

export interface ServiceXtmPlatformBundleManageUsersPageProps {
  params: Promise<{ serviceInstanceId: string }>;
  searchParams: Promise<{ [MANAGE_USERS_ORIGIN_PARAM]?: string | string[] }>;
}

const Page = async ({
  params,
  searchParams,
}: ServiceXtmPlatformBundleManageUsersPageProps) => {
  const xtmPlatformTrialEnabled = await isFeatureEnabled(
    FeatureFlag.XtmPlatformTrial
  );
  if (!xtmPlatformTrialEnabled) {
    notFound();
  }

  const fromParam = (await searchParams)[MANAGE_USERS_ORIGIN_PARAM];
  const fromValue = Array.isArray(fromParam) ? fromParam[0] : fromParam;
  const fromDashboard = fromValue === MANAGE_USERS_ORIGIN_DASHBOARD;

  return (
    <GuardCapacityComponent
      displayError
      shouldNotBePersonalSpace
      capacityRestriction={[
        OrganizationCapability.AdministrateOrganization,
        OrganizationCapability.ManagePlatformRegistration,
      ]}>
      <ClientSection
        params={params}
        fromDashboard={fromDashboard}
      />
    </GuardCapacityComponent>
  );
};

export default Page;
