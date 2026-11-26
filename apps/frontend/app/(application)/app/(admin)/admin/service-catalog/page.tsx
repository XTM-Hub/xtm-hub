'use client';
import GuardCapacityComponent from '@/components/AdminGuard';
import ServiceCatalog from '@/components/admin/service-catalog/ServiceCatalog';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { useTranslate } from '@/hooks/use-translate';

const breadcrumbValue = [
  {
    label: 'MenuLinks.Settings',
  },
  {
    label: 'MenuLinks.ServiceCatalog',
  },
];

export const dynamic = 'force-dynamic';

const Page = () => {
  const t = useTranslate();

  return (
    <GuardCapacityComponent displayError>
      <BreadcrumbNav value={breadcrumbValue} />
      <h1 className="sr-only">{t('MenuLinks.ServiceCatalog')}</h1>
      <ServiceCatalog />
    </GuardCapacityComponent>
  );
};

export default Page;
