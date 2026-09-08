import { ShareLinkButton } from '@/components/ui/share-link/ShareLinkButton';
import { ShareableResourceCardVersion } from '@/components/ui/shareable-resource/card-design/ShareableResourceCardVersion';
import { PublicDocumentData } from '@/utils/shareable-resources/shareable-resources.types';
import { docHasMetadata } from '@/utils/shareable-resources/utils/shareable-resources.client.utils';
import { SimpleTooltip } from '@filigran/ui';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { DocumentMetadataKeyCode } from '@graphql/generated';
import { ReactNode } from 'react';

interface ShareableResourceCardFooterVersionProps {
  document: documentItem_fragment$data | PublicDocumentData;
  publicPath?: boolean;
  shareLinkUrl: string;
  extraContent?: ReactNode;
  /**
   * Whether this connector's product version is incompatible with the
   * currently selected product-version filter. Greys out just the version
   * label, without disabling the whole card.
   */
  isIncompatibleWithSelectedVersion?: boolean;
  incompatibleTooltip?: string;
}
export const ShareableResourceCardFooterVersion = ({
  document,
  publicPath = false,
  shareLinkUrl,
  extraContent,
  isIncompatibleWithSelectedVersion,
  incompatibleTooltip,
}: ShareableResourceCardFooterVersionProps) => {
  // Displays the connector's own version (Document.version), falling back to
  // product_version for older connectors that don't carry a version yet.
  const displayVersion = docHasMetadata(document, 'version')
    ? document.version
    : docHasMetadata(document, DocumentMetadataKeyCode.ProductVersion)
      ? document.product_version
      : null;

  const isPlainSpanBranch =
    publicPath ||
    (docHasMetadata(document, DocumentMetadataKeyCode.ManagerSupported) &&
      !document.manager_supported);

  return (
    <>
      <div className="flex gap-l min-w-0 overflow-hidden">
        {isPlainSpanBranch ? (
          isIncompatibleWithSelectedVersion ? (
            <SimpleTooltip title={incompatibleTooltip}>
              <span
                data-incompatible
                className="text-sm data-[incompatible]:opacity-60">
                {displayVersion}
              </span>
            </SimpleTooltip>
          ) : (
            <span className="text-sm">{displayVersion}</span>
          )
        ) : (
          <ShareableResourceCardVersion
            className="text-sm"
            product_version={displayVersion}
            requiredProductVersion={
              docHasMetadata(document, DocumentMetadataKeyCode.ProductVersion)
                ? document.product_version
                : ''
            }
            isIncompatibleWithSelectedVersion={
              isIncompatibleWithSelectedVersion
            }
            filterIncompatibleTooltip={incompatibleTooltip}
          />
        )}
      </div>
      <div className=" flex flex-row pr-m">
        <ShareLinkButton
          documentId={document.id}
          url={shareLinkUrl}
        />
        {extraContent}
      </div>
    </>
  );
};
