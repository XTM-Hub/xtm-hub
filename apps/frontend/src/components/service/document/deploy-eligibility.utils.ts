import { type AnalyticsDeployEligibility } from '@/lib/analytics/analytics.types';
import {
  isEeCapableContract,
  requiresEnterpriseEdition,
} from '@/utils/platform';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { doesVersionSatisfy } from '@/utils/versioning';
import { type useRegisteredPlatformsFragment$data } from '@generated/useRegisteredPlatformsFragment.graphql';

interface DeployEligibilityInput {
  resource: { type: string; license_type?: string | null };
  platforms: readonly Pick<
    useRegisteredPlatformsFragment$data,
    'contract' | 'version'
  >[];
  requiredProductVersion: string | null | undefined;
}

export const resolveDeployEligibility = ({
  resource,
  platforms,
  requiredProductVersion,
}: DeployEligibilityInput): AnalyticsDeployEligibility => {
  if (platforms.length === 0) {
    return 'No platform connected';
  }
  const requiresEe =
    resource.type === ShareableResourceType.OPENCTI_PLAYBOOK ||
    requiresEnterpriseEdition(resource.license_type);
  const hasDeployablePlatform = platforms.some(
    ({ contract, version }) =>
      (!requiredProductVersion ||
        doesVersionSatisfy({
          givenVersion: version ?? '0.0.0',
          requiredVersion: requiredProductVersion,
        })) &&
      (!requiresEe || isEeCapableContract(contract))
  );
  if (hasDeployablePlatform) {
    return 'Can deploy';
  }
  return requiresEe &&
    !platforms.some(({ contract }) => isEeCapableContract(contract))
    ? 'Enterprise Edition required'
    : 'Platform version too old';
};
