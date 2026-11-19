import { PrefetchedRegisteredPlatformOverview } from '@/components/service/registration/PrefetchedRegisteredPlatformOverview';
import { RegistrationLearnMore } from '@/components/service/registration/RegistrationLearnMore';
import { PlatformIdentifier } from '@graphql/generated';

export interface ServiceOpenCTIRegistrationPageProps {
  params: Promise<{ serviceInstanceId: string }>;
}
const Page = ({ params }: ServiceOpenCTIRegistrationPageProps) => {
  return (
    <>
      <PrefetchedRegisteredPlatformOverview
        params={params}
        platformIdentifier={PlatformIdentifier.Opencti}
      />
      <RegistrationLearnMore platformIdentifier={PlatformIdentifier.Opencti} />
    </>
  );
};

export default Page;
