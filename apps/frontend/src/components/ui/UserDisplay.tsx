import { cn } from '@/lib/utils';
import { formatPersonNames } from '@/utils/format/name';
import { PublicDocumentData } from '@/utils/shareable-resources/shareable-resources.types';
import {
  Avatar,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/ui/clients';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { useTranslations } from 'next-intl';

interface UserDisplayProps {
  uploader:
    | documentItem_fragment$data['uploader']
    | PublicDocumentData['uploader']
    | null
    | undefined;
  className?: string;
  withTooltip?: boolean;
  displayPicture?: boolean;
}

export const UserDisplay = ({
  uploader,
  className,
  withTooltip = false,
  displayPicture = true,
}: UserDisplayProps) => {
  const t = useTranslations('UserDisplay');
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
        <div className="size-8 shrink-0 [&_img]:object-cover">
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
