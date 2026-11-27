import { analyticsId } from '@/lib/analytics/analytics.ids';
import {
  FiligranWebsiteUtm,
  withFiligranWebsiteUtm,
} from '@/utils/filigran-website-utm';
import {
  Text,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';

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
          <Text
            {...analyticsId('resource_external_link_open')}
            variant="content-compact-link"
            className="inline-block max-w-64 truncate align-bottom"
            href={
              filigranWebsiteUtm
                ? withFiligranWebsiteUtm(url, filigranWebsiteUtm)
                : url
            }
            target="_blank"
            rel="noopener noreferrer">
            {url}
          </Text>
        </TooltipTrigger>
        <TooltipContent>{url}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
