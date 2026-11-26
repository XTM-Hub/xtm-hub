import { PortalContext } from '@/components/me/AppPortalContext';
import {
  deriveXtmPlatformTrialPanelView,
  XtmPlatformTrialPanelView,
} from '@/components/service/trial-instances/xtm-platform-trial/request-panel/xtm-platform-trial-panel.utils';
import useGranted from '@/hooks/use-granted';
import { useAdminByPass } from '@/hooks/use-portal-capability';
import {
  OrganizationCapability,
  XtmPlatformBundleDetailsFragment,
} from '@graphql/generated';
import { useContext } from 'react';

export const useXtmPlatformTrialPanelView = (
  bundle: XtmPlatformBundleDetailsFragment | null
): XtmPlatformTrialPanelView => {
  const { isPersonalSpace } = useContext(PortalContext);

  const canAdministrateOrganization = useGranted(
    OrganizationCapability.AdministrateOrganization
  );
  const canManagePlatformRegistration = useGranted(
    OrganizationCapability.ManagePlatformRegistration
  );
  const isPlatformAdmin = useAdminByPass();
  const canRequestTrial = Boolean(
    canAdministrateOrganization ||
    canManagePlatformRegistration ||
    isPlatformAdmin
  );

  return deriveXtmPlatformTrialPanelView({
    isPersonalSpace: isPersonalSpace ?? false,
    isAllowed: canRequestTrial,
    hubStatus: bundle?.hub_status,
  });
};
