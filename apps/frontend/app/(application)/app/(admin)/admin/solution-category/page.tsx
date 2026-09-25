'use client';
import GuardCapacityComponent from '@/components/AdminGuard';
import SolutionCategories from '@/components/admin/solution-category/SolutionCategories';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { useTranslate } from '@/hooks/use-translate';

const breadcrumbValue = [
  {
    label: 'MenuLinks.Settings',
  },
  {
    label: 'MenuLinks.SolutionCategory',
  },
];

export const dynamic = 'force-dynamic';

const Page = () => {
  const t = useTranslate();

  return (
    <GuardCapacityComponent displayError>
      <BreadcrumbNav value={breadcrumbValue} />
      <h1 className="sr-only">{t('MenuLinks.SolutionCategory')}</h1>
      <SolutionCategories />
    </GuardCapacityComponent>
  );
};

export default Page;
