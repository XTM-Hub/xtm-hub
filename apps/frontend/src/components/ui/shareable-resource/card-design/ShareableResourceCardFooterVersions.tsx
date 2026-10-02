import { ShareLinkButton } from '@/components/ui/share-link/ShareLinkButton';
import {
  ShareableResourceCardVersion,
  VersionBadgeStatus,
} from '@/components/ui/shareable-resource/card-design/ShareableResourceCardVersion';
import {
  ConnectorCompatibilityStatus,
  useConnectorCompatibility,
} from '@/hooks/use-connector-compatibility';
import { PublicDocumentData } from '@/utils/shareable-resources/shareable-resources.types';
import { docHasMetadata } from '@/utils/shareable-resources/utils/shareable-resources.client.utils';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { DocumentMetadataKeyCode } from '@graphql/generated';
import { useTranslations } from 'next-intl';
import { ReactNode } from 'react';

interface ShareableResourceCardFooterVersionProps {
  document: documentItem_fragment$data | PublicDocumentData;
  publicPath?: boolean;
  shareLinkUrl: string;
  extraContent?: ReactNode;
}

const BADGE_STATUS: Record<ConnectorCompatibilityStatus, VersionBadgeStatus> = {
  unknown: 'neutral',
  compatible: 'success',
  partial: 'warning',
  incompatible: 'error',
};

const TOOLTIP_KEY: Record<ConnectorCompatibilityStatus, string | undefined> = {
  unknown: undefined,
  compatible: 'Service.Connectors.CompatibleWith',
  partial: 'Service.Connectors.PartiallyCompatible',
  incompatible: 'Service.Connectors.Incompatible',
};

export const ShareableResourceCardFooterVersion = ({
  document,
  publicPath = false,
  shareLinkUrl,
  extraContent,
}: ShareableResourceCardFooterVersionProps) => {
  const t = useTranslations();

  // Decoupled connectors carry their own version; the legacy catalog only
  // exposes the OpenCTI compatibility version.
  const version = docHasMetadata(document, 'version')
    ? document.version
    : docHasMetadata(document, DocumentMetadataKeyCode.ProductVersion)
      ? document.product_version
      : null;

  const minimumDeployableVersion = docHasMetadata(
    document,
    DocumentMetadataKeyCode.MinimumDeployableVersion
  )
    ? document.minimum_deployable_version
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
    minimumDeployableVersion,
    enabled:
      !publicPath && deployable && !!version && !!minimumDeployableVersion,
  });

  const tooltipKey = TOOLTIP_KEY[status];
  // Every message takes what it needs; next-intl ignores the rest.
  const tooltip = tooltipKey
    ? t(tooltipKey, {
        compatiblePlatforms,
        incompatiblePlatforms,
        platformToBeUpdated: incompatiblePlatforms,
        count: incompatibleCount,
      })
    : undefined;

  return (
    <>
      <div className="flex items-center gap-s min-w-0 overflow-hidden">
        <ShareableResourceCardVersion
          version={version}
          status={BADGE_STATUS[status]}
          tooltip={tooltip}
        />
      </div>
      <div className="flex flex-row shrink-0 pr-m">
        <ShareLinkButton
          documentId={document.id}
          url={shareLinkUrl}
        />
        {extraContent}
      </div>
    </>
  );
};
