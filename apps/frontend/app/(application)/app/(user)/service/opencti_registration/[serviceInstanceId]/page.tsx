import { RegisteredPlatformOverview } from '@/components/service/registration/RegisteredPlatformOverview';
import { RegistrationLearnMore } from '@/components/service/registration/RegistrationLearnMore';
import { PlatformIdentifier, ServiceInstanceTag } from '@graphql/generated';

export interface ServiceOpenCTIRegistrationPageProps {
  params: Promise<{ serviceInstanceId: string }>;
}
const Page = ({ params }: ServiceOpenCTIRegistrationPageProps) => {
  return (
    <>
      <RegisteredPlatformOverview
        params={params}
        platformIdentifier={PlatformIdentifier.Opencti}
      />
      <RegistrationLearnMore serviceInstanceTag={ServiceInstanceTag.OpenCti} />
    </>
  );
};

export default Page;
