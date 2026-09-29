'use client';
import { Parameters } from '@/components/admin/parameters/Parameters';
import GuardCapacityComponent from '@/components/AdminGuard';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { useTranslate } from '@/hooks/use-translate';

const breadcrumbValue = [
  {
    label: 'MenuLinks.Settings',
  },
  {
    label: 'MenuLinks.Parameter',
  },
];

// Component
const Page = () => {
  const t = useTranslate();

  return (
    <GuardCapacityComponent displayError>
      <BreadcrumbNav value={breadcrumbValue} />
      <h1 className="sr-only">{t('MenuLinks.Parameter')}</h1>
      <Parameters />
    </GuardCapacityComponent>
  );
};

// Component export
export default Page;
