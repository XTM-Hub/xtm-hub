'use client';

import { Avatar } from '@/components/ui/avatar';
import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import { formatPersonNames } from '@/utils/format/name';
import { PublicDocumentData } from '@/utils/shareable-resources/shareable-resources.types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';

interface UserDisplayProps {
  uploader:
    | documentItem_fragment$data['uploader']
    | PublicDocumentData['uploader']
    | null
    | undefined;
  className?: string;
  withTooltip?: boolean;
  displayPicture?: boolean;
  pictureClassName?: string;
}

export const UserDisplay = ({
  uploader,
  className,
  withTooltip = false,
  displayPicture = true,
  pictureClassName = 'size-8',
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
        !uploader && 'italic text-text-default-secondary',
        className
      )}>
      {displayedIdentity}
    </span>
  );

  return (
    <>
      {displayPicture && (
        <div className={cn('shrink-0', pictureClassName)}>
          <Avatar src={uploader?.picture ?? ''} />
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
