import { resolveDeployEligibility } from '@/components/service/document/deploy-eligibility.utils';
import { type ViewedResource } from '@/components/service/document/resource-view-tracker.utils';
import { ResourceViewTracker } from '@/components/service/document/ResourceViewTracker';
import { useRegisteredPlatforms } from '@/hooks/use-registered-platforms';
import { getPlatformIdentifier } from '@/utils/platform';

interface DeployableResourceViewTrackerProps {
  resource: ViewedResource & { license_type?: string | null };
  requiredProductVersion?: string | null;
}

export const DeployableResourceViewTracker = ({
  resource,
  requiredProductVersion,
}: DeployableResourceViewTrackerProps) => {
  const { platforms } = useRegisteredPlatforms(
    getPlatformIdentifier(resource.type),
    { onlyActive: true }
  );

  return (
    <ResourceViewTracker
      resource={resource}
      deployEligibility={resolveDeployEligibility({
        resource,
        platforms,
        requiredProductVersion,
      })}
    />
  );
};
