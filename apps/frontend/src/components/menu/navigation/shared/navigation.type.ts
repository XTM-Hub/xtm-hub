import { type AnalyticsElementId } from '@/lib/analytics/analytics.ids';
import { type PlatformIdentifier } from '@graphql/generated';
import { ElementType } from 'react';

interface BaseSectionLink {
  label: string;
  external?: boolean;
  highlight?: boolean;
  badge?: string;
  tooltip?: string;
}

export type SectionSubLink = BaseSectionLink &
  (
    | { href: string; analyticsId: AnalyticsElementId }
    | { href?: undefined; analyticsId?: undefined }
  );

export type SectionLink =
  | (SectionSubLink & { subLinks?: undefined })
  | (BaseSectionLink & {
      href?: undefined;
      analyticsId: AnalyticsElementId;
      subLinks: SectionSubLink[];
    });

export interface BottomLink {
  key: string;
  href: string;
  icon: ElementType;
  label: string;
  external?: boolean;
  highlight?: boolean;
  analyticsId: AnalyticsElementId;
}

export interface SectionConfig {
  key: string;
  label: string;
  icon: ElementType;
  pathPrefix: string;
  links: SectionLink[];
  href?: string;
  analyticsId: AnalyticsElementId;
  product?: PlatformIdentifier;
}

export interface NavigationConfig {
  sections: SectionConfig[];
  bottomLinks: BottomLink[];
  footerSections?: SectionConfig[];
}
