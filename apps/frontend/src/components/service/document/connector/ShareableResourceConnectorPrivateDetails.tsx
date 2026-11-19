import {
  ShareableResourceConnectorDetails,
  ShareableResourceConnectorDetailsProps,
} from '@/components/service/document/connector/ShareableResourceConnectorDetails';
import { FiligranWebsiteUtm } from '@/utils/filigran-website-utm';
import { CheckIndeterminateIcon } from '@filigran/icon';

interface ShareableResourceConnectorPrivateDetailsProps {
  connectorDetails: ShareableResourceConnectorDetailsProps['connectorDetails'];
  incompatiblePlatformsCount: number;
  filigranWebsiteUtm?: FiligranWebsiteUtm;
}

export const ShareableResourceConnectorPrivateDetails = ({
  connectorDetails,
  incompatiblePlatformsCount,
  filigranWebsiteUtm,
}: ShareableResourceConnectorPrivateDetailsProps) => {
  const compatibilityItem =
    incompatiblePlatformsCount > 0 ? (
      <span className="text-[var(--text-default-secondary)]/60 flex gap-2 items-center">
        {connectorDetails?.minimum_deployable_version}
        <CheckIndeterminateIcon className="h-4 w-4" />
      </span>
    ) : undefined;

  return (
    <div className="flex flex-col justify-start gap-2 flex-1">
      <ShareableResourceConnectorDetails
        connectorDetails={connectorDetails}
        compatibilityItem={compatibilityItem}
        filigranWebsiteUtm={filigranWebsiteUtm}
      />
    </div>
  );
};
