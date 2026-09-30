import { OpenInNewIcon } from '@filigran/icon';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/ui/clients';
import Link from 'next/link';
import { Button } from '@filigran/design-system';

interface ShareableResourceDetailsLinkProps {
  url: string;
}

export const ShareableResourceDetailsLink = ({
  url,
}: ShareableResourceDetailsLinkProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="p-0 underline"
            priority="tertiary"
            asChild>
            <Link
              href={url}
              rel="noopener noreferrer"
              target="_blank">
              <OpenInNewIcon className="h-4 w-4 mr-s" />
              <span className="max-w-64 overflow-hidden text-ellipsis whitespace-nowrap">
                {url}
              </span>
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{url}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
