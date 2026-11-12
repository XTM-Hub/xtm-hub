'use client';

import { Avatar } from '@/components/ui/avatar';
import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import { getGravatarSizedUrl } from '@/utils/format/gravatar';
import { formatPersonNames } from '@/utils/format/name';
import { PublicDocumentData } from '@/utils/shareable-resources/shareable-resources.types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import { DocumentItemFragment } from '@graphql/generated';

const DEFAULT_PICTURE_SIZE = 32;

interface UserDisplayProps {
  uploader:
    | DocumentItemFragment['uploader']
    | PublicDocumentData['uploader']
    | null
    | undefined;
  className?: string;
  withTooltip?: boolean;
  displayPicture?: boolean;
  /** Displayed size of the picture in CSS pixels. */
  pictureSize?: number;
}

export const UserDisplay = ({
  uploader,
  className,
  withTooltip = false,
  displayPicture = true,
  pictureSize = DEFAULT_PICTURE_SIZE,
}: UserDisplayProps) => {
  const t = useTranslate('UserDisplay');
  const formattedName = formatPersonNames(uploader);
  const fallbackEmail =
    uploader && 'email' in uploader ? (uploader.email ?? '') : '';
  const displayedIdentity = uploader
    ? formattedName || fallbackEmail
    : t('DeletedUser');

  const nameSpan = (
    <span
      className={cn(
        'truncate',
        !uploader && 'italic text-default-secondary',
        className
      )}>
      {displayedIdentity}
    </span>
  );

  return (
    <>
      {displayPicture && (
        <div
          className="shrink-0"
          style={{ width: pictureSize, height: pictureSize }}>
          <Avatar
            src={getGravatarSizedUrl(uploader?.picture ?? '', pictureSize)}
            size={pictureSize}
          />
        </div>
      )}
      {withTooltip ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{nameSpan}</TooltipTrigger>
            <TooltipContent>{displayedIdentity}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        nameSpan
      )}
    </>
  );
};
