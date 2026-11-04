'use client';
import GuardCapacityComponent from '@/components/AdminGuard';
import ServiceCatalog from '@/components/admin/service-catalog/ServiceCatalog';
import { useTranslate } from '@/hooks/use-translate';

export const dynamic = 'force-dynamic';

const Page = () => {
  const t = useTranslate();

  return (
    <GuardCapacityComponent displayError>
      <h1 className="mb-4">{t('MenuLinks.ServiceCatalog')}</h1>
      <ServiceCatalog />
    </GuardCapacityComponent>
  );
};

export default Page;
