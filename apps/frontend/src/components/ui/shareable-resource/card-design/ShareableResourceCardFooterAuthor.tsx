import { UserDisplay } from '@/components/ui/UserDisplay';
import { ShareLinkButton } from '@/components/ui/share-link/ShareLinkButton';
import { PublicDocumentData } from '@/utils/shareable-resources/shareable-resources.types';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { ReactNode } from 'react';

interface ShareableResourceCardFooterAuthorProps {
  document: documentItem_fragment$data | PublicDocumentData;
  shareLinkUrl: string;
  shouldDisplayAuthor?: boolean;
  extraContent?: ReactNode;
}
export const ShareableResourceCardFooterAuthor = ({
  document,
  shareLinkUrl,
  shouldDisplayAuthor = true,
  extraContent,
}: ShareableResourceCardFooterAuthorProps) => {
  return (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-s">
        {shouldDisplayAuthor && (
          <div className="flex min-w-0 items-center gap-s whitespace-nowrap">
            <UserDisplay uploader={document.uploader} />
          </div>
        )}
      </div>
      <div className="flex flex-row shrink-0 self-end pr-m">
        <ShareLinkButton
          documentId={document.id}
          url={shareLinkUrl}
        />
        {extraContent}
      </div>
    </>
  );
};
