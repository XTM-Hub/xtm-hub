'use client';
import { EpicPage } from '@/components/epic/EpicPage';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { useTranslate } from '@/hooks/use-translate';
import { APP_PATH } from '@/utils/path/constant';
import { ServiceInstanceItemFragment } from '@graphql/generated';

interface PreloaderProps {
  serviceInstance: ServiceInstanceItemFragment;
}

const PageLoader = ({ serviceInstance }: PreloaderProps) => {
  const t = useTranslate();

  const breadcrumbValue = [
    {
      label: 'MenuLinks.Home',
      href: `/${APP_PATH}`,
    },
    {
      label: 'Epic.XTMRoadmap',
    },
  ];

  return (
    <>
      <BreadcrumbNav value={breadcrumbValue} />
      <h1 className="sr-only">{t('Epic.XTMRoadmap')}</h1>
      <EpicPage serviceInstance={serviceInstance} />
    </>
  );
};

export default PageLoader;
