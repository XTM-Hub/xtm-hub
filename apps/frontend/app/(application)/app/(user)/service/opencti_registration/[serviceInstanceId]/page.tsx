import { RegisteredPlatformOverview } from '@/components/service/registration/RegisteredPlatformOverview';
import { RegistrationLearnMore } from '@/components/service/registration/RegistrationLearnMore';
import { PlatformIdentifier } from '@graphql/generated';

export interface ServiceOpenCTIRegistrationPageProps {
  params: Promise<{ serviceInstanceId: string }>;
}
const Page = ({ params }: ServiceOpenCTIRegistrationPageProps) => {
  return (
    <>
      <RegisteredPlatformOverview params={params} />
      <RegistrationLearnMore platformIdentifier={PlatformIdentifier.Opencti} />
    </>
  );
};

export default Page;
