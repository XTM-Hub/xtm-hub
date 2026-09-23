import TrialsList from '@/components/trials/TrialsList';
import { productScope } from '@/components/trials/trials.const';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { useTranslate } from '@/hooks/use-translate';
import { PlatformIdentifier } from '@graphql/generated';

const breadcrumbValue = [
  {
    label: 'MenuLinks.Settings',
  },
  {
    label: 'MenuLinks.OpenAEVTrial',
  },
];
const PageLoader = () => {
  const t = useTranslate();
  return (
    <>
      <BreadcrumbNav value={breadcrumbValue} />
      <h1 className="sr-only">{t('MenuLinks.OpenAEVTrial')}</h1>
      <TrialsList scope={productScope(PlatformIdentifier.Openaev)} />
    </>
  );
};

// Component export
export default PageLoader;
