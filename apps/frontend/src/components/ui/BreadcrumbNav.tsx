'use client';
import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@filigran/ui';
import Link from 'next/link';
import { Fragment } from 'react';

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
  return (
    <Breadcrumb className="pb-s sm:pb-l">
      <BreadcrumbList className="pl-0">
        {value.map((link, index) => {
          const { href } = link;
          const lastIndex = value.length - 1 === index;
          const firstIndex = 0 === index;
          return (
            <Fragment key={index}>
              {!firstIndex && (
                <BreadcrumbSeparator
                  className={cn(lastIndex && 'text-text-default-primary')}
                />
              )}
              {href ? (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link
                        className="hover:underline text-text-default-disabled"
                        href={href}>
                        {renderLabel(link)}
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </>
              ) : (
                <BreadcrumbItem>
                  <BreadcrumbPage
                    className={cn(!lastIndex && 'text-text-default-primary')}>
                    {renderLabel(link)}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              )}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
