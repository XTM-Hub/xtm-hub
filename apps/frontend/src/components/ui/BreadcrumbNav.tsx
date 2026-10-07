'use client';
import { useTranslate } from '@/hooks/use-translate';
import { Breadcrumbs, BreadcrumbsItem } from '@filigran/design-system';
import Link from 'next/link';

interface BreadcrumbProps {
  value: BreadcrumbNavLink[];
}

export interface BreadcrumbNavLink {
  href?: string;
  label: string;
  original?: boolean;
  fallback?: string;
}

export const BreadcrumbNav = ({ value }: BreadcrumbProps) => {
  const t = useTranslate();
  const renderLabel = ({ label, original, fallback }: BreadcrumbNavLink) => {
    if (original) {
      return label;
    }
    if (fallback !== undefined && !t.has(label)) {
      return fallback;
    }
    return t(label);
  };
  const items: BreadcrumbsItem[] = value.map((link, index) => {
    const label = renderLabel(link);
    // A last entry with an href is not marked current: a current item is
    // never a link and would drop its destination.
    if (link.href) {
      return { label, href: link.href };
    }
    return index === value.length - 1 ? { label, current: true } : { label };
  });
  return (
    <Breadcrumbs
      items={items}
      linkComponent={Link}
      className="pb-s sm:pb-l"
    />
  );
};
