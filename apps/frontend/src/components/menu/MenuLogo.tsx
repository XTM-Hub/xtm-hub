import { DisplayLogo } from '@/components/ui/DisplayLogo';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import Link from 'next/link';

interface MenuLogoProps {
  href: string;
}

export const MenuLogo = ({ href }: MenuLogoProps) => {
  return (
    <div className="flex z-10 shrink-0 sticky top-0 h-16 items-center px-3">
      <Link
        {...analyticsId('nav_home_open')}
        href={href}
        aria-label="XTM Hub by Filigran"
        className="flex items-center">
        <DisplayLogo className="w-40" />
      </Link>
    </div>
  );
};
