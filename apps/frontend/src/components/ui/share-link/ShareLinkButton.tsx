'use client';
import { updateShareNumber } from '@/components/ui/share-link/ShareLinkActions';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import usePublicPath from '@/hooks/use-public-path';
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
import { unstable_rethrow } from 'next/navigation';
import { useCopyToClipboard } from 'usehooks-ts';

export interface ShareLinkButtonProps {
  url: string;
  documentId?: string;
  tooltipText?: string;
  size?: IconButtonProps['size'];
  onShare?: () => void;
}

export const ShareLinkButton = (props: ShareLinkButtonProps) => {
  const isPublicPath = usePublicPath();
  return isPublicPath ? (
    <ShareLinkServerAction {...props} />
  ) : (
    <ShareLinkClientButton {...props} />
  );
};

const useShowShareNumberError = () => {
  const t = useTranslate();
  return () =>
    showSnackbar({
      severity: 'error',
      title: t('Utils.Error'),
      description: t('Error.AnErrorOccured'),
    });
};

export const ShareLinkClientButton = (props: ShareLinkButtonProps) => {
  const { documentId, onShare, ...buttonProps } = props;
  const showShareNumberError = useShowShareNumberError();
  const { mutate: incrementShareNumber } =
    useIncrementShareNumberDocumentMutation(portalGraphqlClient, {
      onSuccess: () => onShare?.(),
      onError: showShareNumberError,
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

export const ShareLinkServerAction = (props: ShareLinkButtonProps) => {
  const { documentId, onShare, ...buttonProps } = props;
  const showShareNumberError = useShowShareNumberError();
  return (
    <ShareLinkCommonButton
      {...buttonProps}
      onClickAction={() => {
        if (!documentId) return;
        updateShareNumber({
          variables: {
            documentId,
          },
        })
          .then(() => onShare?.())
          .catch((error: unknown) => {
            // Hands the signup redirect back to Next.js instead of reporting it.
            unstable_rethrow(error);
            showShareNumberError();
          });
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
