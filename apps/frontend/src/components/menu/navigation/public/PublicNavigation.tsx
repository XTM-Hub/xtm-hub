'use client';

import { SharedNavigation } from '@/components/menu/navigation/shared/SharedNavigation';
import { usePublicNavigation } from './use-public-navigation';

interface PublicNavigationProps {
  open: boolean;
  visibleServiceSlugs: string[];
  isXtmPlatformTrialEnabled: boolean;
}

const PublicNavigation = ({
  open,
  visibleServiceSlugs,
  isXtmPlatformTrialEnabled,
}: PublicNavigationProps) => {
  const { sections, bottomLinks, footerSections } = usePublicNavigation(
    visibleServiceSlugs,
    isXtmPlatformTrialEnabled
  );

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
