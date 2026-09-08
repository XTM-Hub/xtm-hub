import { isFeatureEnabled } from '@/utils/settings.service';
import { FeatureFlag } from '@graphql/generated';
import { notFound } from 'next/navigation';
import PageLoader from './page-loader';

const Page = async () => {
  const xtmPlatformTrialEnabled = await isFeatureEnabled(
    FeatureFlag.XtmPlatformTrial
  );
  if (!xtmPlatformTrialEnabled) {
    notFound();
  }

  return <PageLoader />;
};

export default Page;
