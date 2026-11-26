import '@styles/globals.css';

import Login from '@/components/login/Login';
import { ReactQueryProvider } from '@/components/ReactQueryProvider';
import { loadMeUser } from '@/utils/load-me-user';
import { getMetadataBase } from '@/utils/metadata';
import { APP_PATH } from '@/utils/path/constant';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const generateMetadata = async (): Promise<Metadata> => {
  return {
    title: 'Sign in XTM Hub',
    description: 'XTM Hub application by Filigran',
    metadataBase: await getMetadataBase(),
  };
};

export const dynamic = 'force-dynamic';

const Page = async () => {
  const me = await loadMeUser();
  if (me) {
    redirect(`/${APP_PATH}`);
  }

  return (
    <ReactQueryProvider>
      <Login />
    </ReactQueryProvider>
  );
};

export default Page;
