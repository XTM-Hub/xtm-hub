import { ShareLinkButton } from '@/components/ui/share-link/ShareLinkButton';
import { ConnectorCompatibilityChip } from '@/components/ui/shareable-resource/ConnectorCompatibilityChip';
import { PublicDocumentData } from '@/utils/shareable-resources/shareable-resources.types';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { ReactNode } from 'react';

interface ShareableResourceCardFooterVersionProps {
  document: documentItem_fragment$data | PublicDocumentData;
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
      <div className="flex items-center gap-s min-w-0 overflow-hidden">
        <ConnectorCompatibilityChip
          document={document}
          publicPath={publicPath}
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
