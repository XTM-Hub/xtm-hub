import { PrefetchedFeatureVotingList } from '@/components/feature-voting/PrefetchedFeatureVotingList';
import { APP_PATH } from '@/utils/path/constant';
import { ServiceDefinitionIdentifier } from '@graphql/generated';

export const dynamic = 'force-dynamic';

interface FeatureVotingPageProps {
  params: Promise<{ serviceInstanceId: string }>;
}

const Page = async ({ params }: FeatureVotingPageProps) => {
  const { serviceInstanceId } = await params;
  const decodedServiceInstanceId = decodeURIComponent(serviceInstanceId);

  return (
    <PrefetchedFeatureVotingList
      serviceInstanceId={decodedServiceInstanceId}
      roadmapHref={`/${APP_PATH}/service/${ServiceDefinitionIdentifier.XtmPlatformRoadmap}/${serviceInstanceId}`}
    />
  );
};

export default Page;
