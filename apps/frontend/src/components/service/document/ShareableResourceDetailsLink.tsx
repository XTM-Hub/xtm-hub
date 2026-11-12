import { analyticsId } from '@/lib/analytics/analytics.ids';
import {
  FiligranWebsiteUtm,
  withFiligranWebsiteUtm,
} from '@/utils/filigran-website-utm';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import { OpenInNewIcon } from '@filigran/icon';
import Link from 'next/link';

interface ShareableResourceDetailsLinkProps {
  url: string;
  // Tags the link when it points to filigran.io, the displayed url stays untouched
  filigranWebsiteUtm?: FiligranWebsiteUtm;
}

export const ShareableResourceDetailsLink = ({
  url,
  filigranWebsiteUtm,
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
              {...analyticsId('resource_external_link_open')}
              href={
                filigranWebsiteUtm
                  ? withFiligranWebsiteUtm(url, filigranWebsiteUtm)
                  : url
              }
              rel="noopener noreferrer"
              target="_blank">
              <OpenInNewIcon className="h-4 w-4 mr-2" />
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
