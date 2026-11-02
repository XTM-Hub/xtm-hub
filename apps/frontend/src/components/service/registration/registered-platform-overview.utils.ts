import type { BreadcrumbNavLink } from '@/components/ui/BreadcrumbNav';
import { ADMIN_CSM_BOARD_PATH, APP_PATH } from '@/utils/path/constant';

// Opened from the CSM board, the page of a platform leads back to it rather than to the home of a customer.
export const getRegisteredPlatformBreadcrumbs = ({
  platformTitle,
  isFromCsmBoard,
}: {
  platformTitle: string;
  isFromCsmBoard: boolean;
}): BreadcrumbNavLink[] => {
  const platformLink = { label: platformTitle, original: true };
  if (isFromCsmBoard) {
    return [
      { label: 'MenuLinks.Settings' },
      { label: 'MenuLinks.CSMBoard', href: ADMIN_CSM_BOARD_PATH },
      platformLink,
    ];
  }
  return [{ label: 'MenuLinks.Home', href: `/${APP_PATH}` }, platformLink];
};
