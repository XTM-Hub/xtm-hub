'use client';
import GuardCapacityComponent from '@/components/AdminGuard';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { useTranslate } from '@/hooks/use-translate';
import { PortalCapability } from '@graphql/generated';

const breadcrumbValue = [
  {
    label: 'MenuLinks.Settings',
  },
  {
    label: 'MenuLinks.CSMBoard',
  },
];

const Page = () => {
  const t = useTranslate();

  return (
    <GuardCapacityComponent
      portalCapabilityRestriction={[PortalCapability.ReadSaasMetrics]}
      displayError>
      <BreadcrumbNav value={breadcrumbValue} />
      <h1>{t('MenuLinks.CSMBoard')}</h1>
      <div>{t('CSMBoard.ComingSoon')}</div>
    </GuardCapacityComponent>
  );
};

export default Page;
