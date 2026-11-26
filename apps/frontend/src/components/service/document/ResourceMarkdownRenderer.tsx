'use client';

import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import {
  FiligranWebsiteUtm,
  withFiligranWebsiteUtm,
} from '@/utils/filigran-website-utm';
import { useCallback } from 'react';

interface ResourceMarkdownRendererProps {
  source: string;
  className?: string;
  // Tags the links to filigran.io written in the markdown
  filigranWebsiteUtm: FiligranWebsiteUtm;
}

// Server pages cannot hand a function to a client component, so the link
// rewrite is built here from serialisable props
const ResourceMarkdownRenderer = ({
  source,
  className,
  filigranWebsiteUtm: { campaign, content },
}: ResourceMarkdownRendererProps) => {
  const transformLinkHref = useCallback(
    (href: string) => withFiligranWebsiteUtm(href, { campaign, content }),
    [campaign, content]
  );

  return (
    <MarkdownRenderer
      source={source}
      className={className}
      linkAnalyticsId="resource_description_link_open"
      transformLinkHref={transformLinkHref}
    />
  );
};

export default ResourceMarkdownRenderer;
