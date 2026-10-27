'use client';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { ShareIcon } from '@filigran/icon';
import { useIncrementShareNumberDocumentMutation } from '@graphql/generated';

import {
  IconButton,
  IconButtonProps,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import { useCopyToClipboard } from 'usehooks-ts';

export interface ShareLinkButtonProps {
  url: string;
  documentId?: string;
  tooltipText?: string;
  size?: IconButtonProps['size'];
  onShare?: () => void;
}

export const ShareLinkButton = (props: ShareLinkButtonProps) => {
  const { documentId, onShare, ...buttonProps } = props;
  const { mutate: incrementShareNumber } =
    useIncrementShareNumberDocumentMutation(portalGraphqlClient, {
      onSuccess: () => onShare?.(),
    });

  return (
    <ShareLinkCommonButton
      {...buttonProps}
      onClickAction={() => {
        if (!documentId) return;
        incrementShareNumber({ documentId });
      }}
    />
  );
};

type ShareLinkCommonProps = Omit<
  ShareLinkButtonProps,
  'documentId' | 'onShare'
> & {
  onClickAction: () => void;
};
export const ShareLinkCommonButton = ({
  url,
  onClickAction,
  tooltipText,
  size,
}: ShareLinkCommonProps) => {
  const t = useTranslate();
  const [_, copy] = useCopyToClipboard();

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    copy(url)
      .then(() => {
        onClickAction();
        showSnackbar({
          severity: 'success',
          title: t('Service.ShareableResources.Copied'),
        });
      })
      .catch((error) => {
        showSnackbar({
          severity: 'error',
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
            size={size}
            onClick={handleCopy}
            className="z-[2]"
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
