import OrganizationList from '@/components/organization/OrganizationList';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { useTranslate } from '@/hooks/use-translate';

const breadcrumbValue = [
  {
    label: 'MenuLinks.Settings',
  },
  {
    label: 'MenuLinks.Organization',
  },
];
const PageLoader = () => {
  const t = useTranslate();
  return (
    <>
      <BreadcrumbNav value={breadcrumbValue} />
      <h1 className="sr-only">{t('MenuLinks.Organization')}</h1>
      <OrganizationList />
    </>
  );
};

// Component export
export default PageLoader;
