import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import PageLoader from './page-loader';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();

  return {
    title: `${t('Service.Trials.XtmPlatform.Page.Title')} | XTM Hub`,
  };
}

const Page = () => <PageLoader />;

export default Page;
