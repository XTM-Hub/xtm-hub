import { BUNDLE_SCOPE } from '@/components/trials/trials.const';
import TrialsList from '@/components/trials/TrialsList';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { useTranslate } from '@/hooks/use-translate';

const breadcrumbValue = [
  {
    label: 'MenuLinks.Settings',
  },
  {
    label: 'MenuLinks.ManageTrials',
  },
];

const PageLoader = () => {
  const t = useTranslate();
  return (
    <>
      <BreadcrumbNav value={breadcrumbValue} />
      <h1 className="sr-only">{t('MenuLinks.ManageTrials')}</h1>
      <TrialsList scope={BUNDLE_SCOPE} />
    </>
  );
};

export default PageLoader;
