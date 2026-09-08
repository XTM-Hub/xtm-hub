import { ElementType } from 'react';

interface BaseSectionLink {
  href?: string;
  label: string;
  external?: boolean;
  highlight?: boolean;
  badge?: string;
  tooltip?: string;
}

export type SectionSubLink = BaseSectionLink;

export interface SectionLink extends BaseSectionLink {
  subLinks?: SectionSubLink[];
}

export interface BottomLink {
  key: string;
  href: string;
  icon: ElementType;
  label: string;
  external?: boolean;
  highlight?: boolean;
}

export interface SectionConfig {
  key: string;
  label: string;
  icon: ElementType;
  pathPrefix: string;
  links: SectionLink[];
  href?: string;
}

export interface NavigationConfig {
  sections: SectionConfig[];
  bottomLinks: BottomLink[];
  footerSections?: SectionConfig[];
}
