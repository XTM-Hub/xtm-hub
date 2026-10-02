'use client';

import { SharedNavigation } from '@/components/menu/navigation/shared/SharedNavigation';
import { usePublicNavigation } from './use-public-navigation';

interface PublicNavigationProps {
  open: boolean;
  visibleServiceSlugs: string[];
}

const PublicNavigation = ({
  open,
  visibleServiceSlugs,
}: PublicNavigationProps) => {
  const { sections, bottomLinks, footerSections } =
    usePublicNavigation(visibleServiceSlugs);

  return (
    <SharedNavigation
      open={open}
      sections={sections}
      bottomLinks={bottomLinks}
      footerSections={footerSections}
    />
  );
};

export default PublicNavigation;
