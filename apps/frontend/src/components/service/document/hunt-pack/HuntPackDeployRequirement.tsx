'use client';

import { useIncompatibleVersionMessage } from '@/components/service/document/one-click-deploy/use-deploy-resource-title';
import { ShareableResourceIncompatibleWarning } from '@/components/service/document/ShareableResourceIncompatibleWarning';
import { useBuildCompatibilityTranslationKey } from '@/hooks/use-build-compatibility-translation-key';
import { useRegisteredPlatforms } from '@/hooks/use-registered-platforms';
import { getPlatformIdentifier } from '@/utils/platform';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';

interface HuntPackDeployRequirementProps {
  documentData: documentItem_fragment$data;
  requiredProductVersion: string;
}

/**
 * Says inline, when no connected product can take the hunt pack, which product to
 * update and to which version: the disabled deploy button cannot take the focus.
 */
export const HuntPackDeployRequirement = ({
  documentData,
  requiredProductVersion,
}: HuntPackDeployRequirementProps) => {
  const { platforms } = useRegisteredPlatforms(
    getPlatformIdentifier(documentData.type),
    { onlyActive: true }
  );
  const { platformToBeUpdated, incompatiblePlatformsCount } =
    useBuildCompatibilityTranslationKey({ platforms, requiredProductVersion });
  const incompatibleVersionMessage =
    useIncompatibleVersionMessage(documentData);

  if (platforms.length === 0 || incompatiblePlatformsCount < platforms.length) {
    return null;
  }
  return (
    <ShareableResourceIncompatibleWarning
      message={incompatibleVersionMessage(
        platformToBeUpdated,
        requiredProductVersion
      )}
    />
  );
};
