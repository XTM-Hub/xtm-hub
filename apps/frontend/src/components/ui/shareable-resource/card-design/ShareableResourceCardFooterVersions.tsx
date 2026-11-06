import { ShareLinkButton } from '@/components/ui/share-link/ShareLinkButton';
import { ConnectorCompatibilityChip } from '@/components/ui/shareable-resource/ConnectorCompatibilityChip';
import { ShareableResourceCardSupportIcons } from '@/components/ui/shareable-resource/card-design/ShareableResourceCardSupportIcons';
import { PublicDocumentData } from '@/utils/shareable-resources/shareable-resources.types';
import { DocumentItemFragment } from '@graphql/generated';
import { ReactNode } from 'react';

interface ShareableResourceCardFooterVersionProps {
  document: DocumentItemFragment | PublicDocumentData;
  publicPath?: boolean;
  shareLinkUrl: string;
  extraContent?: ReactNode;
}

export const ShareableResourceCardFooterVersion = ({
  document,
  publicPath = false,
  shareLinkUrl,
  extraContent,
}: ShareableResourceCardFooterVersionProps) => {
  return (
    <>
      <div className="flex items-center gap-2 min-w-0 overflow-hidden">
        <ConnectorCompatibilityChip
          document={document}
          publicPath={publicPath}
        />
        <ShareableResourceCardSupportIcons document={document} />
      </div>
      <div className="flex flex-row shrink-0 gap-1">
        <ShareLinkButton
          documentId={document.id}
          url={shareLinkUrl}
          size="sm"
        />
        {extraContent}
      </div>
    </>
  );
};
