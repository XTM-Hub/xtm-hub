'use client';
import { cn } from '@/lib/utils';
import { toExternalHref } from '@/utils/external-url';

interface TrialsExternalLinkProps {
  url: string | null | undefined;
  className?: string;
  fallback?: string;
}

export const TrialsExternalLink = ({
  url,
  className,
  fallback = '-',
}: TrialsExternalLinkProps) => {
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
      className={cn('text-text-brand-primary underline', className)}
      onClick={(event) => event.stopPropagation()}>
      {trimmedUrl}
    </a>
  );
};
