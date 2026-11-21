import { fetchServiceInstanceById } from '@/components/service/service-instance.server';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { getTranslate } from '@/hooks/get-translate';
import { APP_PATH } from '@/utils/path/constant';
import PageLoader from './page-loader';

interface ServiceCustomViewsPageProps {
  params: Promise<{ serviceInstanceId: string }>;
}

const Page = async ({ params }: ServiceCustomViewsPageProps) => {
  const { serviceInstanceId } = await params;
  const decodedServiceInstanceId = decodeURIComponent(serviceInstanceId);
  const t = await getTranslate();
  const serviceInstance = await fetchServiceInstanceById(
    decodedServiceInstanceId
  );

  const breadcrumbs = [
    {
      label: 'MenuLinks.Home',
      href: `/${APP_PATH}`,
    },
    {
      label: serviceInstance?.name ?? '',
      original: true,
    },
  ];

  return (
    <>
      {serviceInstance ? (
        <>
          <BreadcrumbNav value={breadcrumbs} />
          <PageLoader serviceInstance={serviceInstance} />
        </>
      ) : (
        <h1>{t('Utils.ServiceNotFound')}</h1>
      )}
    </>
  );
};

export default Page;
