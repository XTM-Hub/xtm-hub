import { RegisteredPlatformOverview } from '@/components/service/registration/RegisteredPlatformOverview';
import { RegistrationLearnMore } from '@/components/service/registration/RegistrationLearnMore';
import { PlatformIdentifier } from '@graphql/generated';

export interface ServiceXTMOneRegistrationPageProps {
  params: Promise<{ serviceInstanceId: string }>;
}
const Page = ({ params }: ServiceXTMOneRegistrationPageProps) => {
  return (
    <>
      <RegisteredPlatformOverview params={params} />
      <RegistrationLearnMore platformIdentifier={PlatformIdentifier.Xtmone} />
    </>
  );
};

export default Page;
