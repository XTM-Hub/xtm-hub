import {
  ShareableResourceCardVersion,
  VersionBadgeStatus,
} from '@/components/ui/shareable-resource/card-design/ShareableResourceCardVersion';
import {
  ConnectorCompatibilityStatus,
  useConnectorCompatibility,
} from '@/hooks/use-connector-compatibility';
import { useTranslate } from '@/hooks/use-translate';
import { PublicDocumentData } from '@/utils/shareable-resources/shareable-resources.types';
import { docHasMetadata } from '@/utils/shareable-resources/utils/shareable-resources.client.utils';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { DocumentMetadataKeyCode } from '@graphql/generated';

interface ConnectorCompatibilityChipProps {
  document: documentItem_fragment$data | PublicDocumentData;
  publicPath?: boolean;
}

const BADGE_STATUS: Record<ConnectorCompatibilityStatus, VersionBadgeStatus> = {
  unknown: 'neutral',
  compatible: 'success',
  partial: 'warning',
  incompatible: 'error',
};

export const ConnectorCompatibilityChip = ({
  document,
  publicPath = false,
}: ConnectorCompatibilityChipProps) => {
  const t = useTranslate();

  const productVersion = docHasMetadata(
    document,
    DocumentMetadataKeyCode.ProductVersion
  )
    ? document.product_version
    : null;

  // A connector that cannot be deployed automatically gets no verdict: the
  // tooltips all talk about deploying it.
  const deployable =
    !docHasMetadata(document, DocumentMetadataKeyCode.ManagerSupported) ||
    !!document.manager_supported;

  const {
    status,
    compatiblePlatforms,
    incompatiblePlatforms,
    incompatibleCount,
  } = useConnectorCompatibility({
    requiredVersion: productVersion,
    enabled: !publicPath && deployable && !!productVersion,
  });

  const tooltip =
    status === 'compatible'
      ? t('Service.Connectors.CompatibleWith', { compatiblePlatforms })
      : status === 'partial'
        ? t('Service.Connectors.PartiallyCompatible', {
            compatiblePlatforms,
            incompatiblePlatforms,
            count: incompatibleCount,
          })
        : status === 'incompatible'
          ? t('Service.Connectors.Incompatible', {
              platformToBeUpdated: incompatiblePlatforms,
              count: incompatibleCount,
            })
          : undefined;

  return (
    <ShareableResourceCardVersion
      version={productVersion}
      status={BADGE_STATUS[status]}
      tooltip={tooltip}
    />
  );
};
