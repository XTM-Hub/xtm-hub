'use client';

import { AdminRegisteredPlatforms } from '@/components/admin/registered-platform/AdminRegisteredPlatforms';
import GuardCapacityComponent from '@/components/AdminGuard';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { useTranslate } from '@/hooks/use-translate';
import { PortalCapability } from '@graphql/generated';

const breadcrumbValue = [
  { label: 'MenuLinks.Settings' },
  { label: 'MenuLinks.RegisteredPlatforms' },
];

const Page = () => {
  const t = useTranslate();
  return (
    <GuardCapacityComponent
      portalCapabilityRestriction={[PortalCapability.Bypass]}
      displayError>
      <BreadcrumbNav value={breadcrumbValue} />
      <h1 className="sr-only">{t('MenuLinks.RegisteredPlatforms')}</h1>
      <AdminRegisteredPlatforms />
    </GuardCapacityComponent>
  );
};

export default Page;
