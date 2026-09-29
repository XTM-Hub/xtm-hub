'use client';
import UseCases from '@/components/admin/use-case/UseCases';
import GuardCapacityComponent from '@/components/AdminGuard';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { useTranslate } from '@/hooks/use-translate';

export const dynamic = 'force-dynamic';

const breadcrumbValue = [
  {
    label: 'MenuLinks.Settings',
  },
  {
    label: 'MenuLinks.UseCase',
  },
];

// Component
const Page = () => {
  const t = useTranslate();

  return (
    <GuardCapacityComponent displayError>
      <BreadcrumbNav value={breadcrumbValue} />
      <h1 className="sr-only">{t('MenuLinks.UseCase')}</h1>
      <UseCases />
    </GuardCapacityComponent>
  );
};

// Component export
export default Page;
