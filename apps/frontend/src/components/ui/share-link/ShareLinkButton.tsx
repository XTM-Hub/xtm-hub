'use client';
import { updateShareNumber } from '@/components/ui/share-link/ShareLinkActions';
import usePublicPath from '@/hooks/use-public-path';
import { ShareIcon } from '@filigran/icon';
import {
  toast,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/ui/clients';
import { useTranslations } from 'next-intl';
import { graphql, useMutation } from 'react-relay';
import { useCopyToClipboard } from 'usehooks-ts';
import { IconButton } from '@filigran/design-system';

export interface ShareLinkButtonProps {
  url: string;
  documentId: string;
  tooltipText?: string;
}

export const shareLinkMutation = graphql`
  mutation ShareLinkButtonMutation($documentId: DocumentId!) {
    incrementShareNumberDocument(documentId: $documentId) {
      share_number
    }
  }
`;

export const ShareLinkButton = (props: ShareLinkButtonProps) => {
  const isPublicPath = usePublicPath();
  return isPublicPath ? (
    <ShareLinkServerAction {...props} />
  ) : (
    <ShareLinkClientButton {...props} />
  );
};

export const ShareLinkClientButton = (props: ShareLinkButtonProps) => {
  const [commitMutation] = useMutation(shareLinkMutation);

  const { documentId, ..._ } = props;
  return (
    <ShareLinkCommonButton
      {...props}
      onClickAction={() =>
        commitMutation({
          variables: {
            documentId,
          },
        })
      }
    />
  );
};

export const ShareLinkServerAction = (props: ShareLinkButtonProps) => {
  const { documentId, ..._ } = props;
  return (
    <ShareLinkCommonButton
      {...props}
      onClickAction={() => {
        updateShareNumber({
          variables: {
            documentId,
          },
        });
      }}
    />
  );
};

type ShareLinkCommonProps = ShareLinkButtonProps & {
  onClickAction: () => void;
};
export const ShareLinkCommonButton = ({
  url,
  onClickAction,
  tooltipText,
}: ShareLinkCommonProps) => {
  const t = useTranslations();
  const [_, copy] = useCopyToClipboard();

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    copy(url)
      .then(() => {
        onClickAction();
        toast({
          description: t('Service.ShareableResources.Copied'),
        });
      })
      .catch((error) => {
        toast({
          title: t('Utils.FailedToCopy'),
          description: error.message,
        });
      });
  };
  return (
    <TooltipProvider>
      <Tooltip
        delayDuration={50}
        disableHoverableContent={true}>
        <TooltipTrigger asChild>
          <IconButton
            priority="tertiary"
            onClick={handleCopy}
            className="z-[2] text-primary"
            aria-label={
              tooltipText
                ? t(tooltipText)
                : t('Service.ShareableResources.Share')
            }
            icon={<ShareIcon className="h-4 w-4" />}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {tooltipText
              ? t(tooltipText)
              : t('Service.ShareableResources.Share')}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
