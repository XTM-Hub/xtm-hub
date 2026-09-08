import { PortalContext } from '@/components/me/AppPortalContext';
import {
  deriveXtmPlatformTrialPanelView,
  XtmPlatformTrialPanelView,
} from '@/components/service/trial-instances/xtm-platform-trial/xtm-platform-trial-panel.utils';
import useGranted from '@/hooks/use-granted';
import { useAdminByPass } from '@/hooks/use-portal-capability';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  OrganizationCapability,
  PlatformIdentifier,
  PlatformTrialStatusQueryVariables,
  usePlatformTrialStatusQuery,
  XtmPlatformBundleDetailsFragment,
} from '@graphql/generated';
import { platformTrialKeys } from '@graphql/trial/trial.keys';
import { useContext } from 'react';

interface UseXtmPlatformTrialPanelViewOptions {
  enabled?: boolean;
}

interface UseXtmPlatformTrialPanelViewResult {
  view: XtmPlatformTrialPanelView | null;
  showLimitations: boolean;
  ongoingStandaloneTrials: PlatformIdentifier[];
}

export const useXtmPlatformTrialPanelView = (
  bundle: XtmPlatformBundleDetailsFragment | null,
  { enabled = true }: UseXtmPlatformTrialPanelViewOptions = {}
): UseXtmPlatformTrialPanelViewResult => {
  const { me, isPersonalSpace } = useContext(PortalContext);
  const organizationId = me?.selected_organization_id ?? '';

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

  const variables: PlatformTrialStatusQueryVariables = { organizationId };
  const { data, isLoading, isPending, isError } = usePlatformTrialStatusQuery(
    portalGraphqlClient,
    variables,
    {
      enabled: enabled && !!organizationId,
      queryKey: platformTrialKeys.platformTrialStatus(variables),
    }
  );

  const ongoingStandaloneTrials =
    data?.platformTrialStatus?.ongoingStandaloneTrials ?? [];

  if (!enabled || !organizationId || isLoading || isPending || isError) {
    return { view: null, showLimitations: false, ongoingStandaloneTrials: [] };
  }

  const view = deriveXtmPlatformTrialPanelView({
    isPersonalSpace: isPersonalSpace ?? false,
    isAllowed: canRequestTrial,
    ongoingStandaloneTrials,
    hubStatus: bundle?.hub_status,
  });

  return {
    view,
    showLimitations: view.kind === 'form',
    ongoingStandaloneTrials,
  };
};
