'use client';
import {
  analyticsId,
  type AnalyticsElementId,
} from '@/lib/analytics/analytics.ids';
import { cn } from '@/lib/utils';
import { toExternalHref } from '@/utils/external-url';

interface ExternalLinkProps {
  url: string | null | undefined;
  analyticsId: AnalyticsElementId;
  /** Applied to the link and to the plain text alike. */
  className?: string;
  /** Applied to the link only. */
  linkClassName?: string;
  fallback?: string;
}

// Opens a URL in a new tab, without giving it access to the Hub. The URL may come from outside the Hub (a platform
// sends its own): only an http(s) URL becomes a link, one without scheme as https; anything else (javascript:, file:)
// is text.
export const ExternalLink = ({
  url,
  analyticsId: elementId,
  className,
  linkClassName,
  fallback = '-',
}: ExternalLinkProps) => {
  const trimmedUrl = url?.trim();
  const href = toExternalHref(trimmedUrl);

  if (!href) {
    return <span className={className}>{trimmedUrl || fallback}</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      {...analyticsId(elementId)}
      className={cn('underline', className, linkClassName)}
      onClick={(event) => event.stopPropagation()}>
      {trimmedUrl}
    </a>
  );
};
