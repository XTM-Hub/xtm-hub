import CompetitorList from '@/components/competitor/CompetitorList';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { useTranslate } from '@/hooks/use-translate';

const breadcrumbValue = [
  {
    label: 'MenuLinks.Settings',
  },
  {
    label: 'MenuLinks.Competitor',
  },
];
const PageLoader = () => {
  const t = useTranslate();
  return (
    <>
      <BreadcrumbNav value={breadcrumbValue} />
      <h1 className="sr-only">{t('MenuLinks.Competitor')}</h1>
      <CompetitorList />
    </>
  );
};

// Component export
export default PageLoader;
