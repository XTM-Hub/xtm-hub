import { PrefetchedRegisteredPlatformOverview } from '@/components/service/registration/PrefetchedRegisteredPlatformOverview';
import { RegistrationLearnMore } from '@/components/service/registration/RegistrationLearnMore';
import { PlatformIdentifier } from '@graphql/generated';

export interface ServiceOpenAEVRegistrationPageProps {
  params: Promise<{ serviceInstanceId: string }>;
}
const Page = ({ params }: ServiceOpenAEVRegistrationPageProps) => {
  return (
    <>
      <PrefetchedRegisteredPlatformOverview
        params={params}
        platformIdentifier={PlatformIdentifier.Openaev}
      />
      <RegistrationLearnMore platformIdentifier={PlatformIdentifier.Openaev} />
    </>
  );
};

export default Page;
