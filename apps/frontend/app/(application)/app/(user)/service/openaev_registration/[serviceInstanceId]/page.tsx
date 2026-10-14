import { RegisteredPlatformOverview } from '@/components/service/registration/RegisteredPlatformOverview';
import { RegistrationLearnMore } from '@/components/service/registration/RegistrationLearnMore';
import { PlatformIdentifier, ServiceInstanceTag } from '@graphql/generated';

export interface ServiceOpenAEVRegistrationPageProps {
  params: Promise<{ serviceInstanceId: string }>;
}
const Page = ({ params }: ServiceOpenAEVRegistrationPageProps) => {
  return (
    <>
      <RegisteredPlatformOverview
        params={params}
        platformIdentifier={PlatformIdentifier.Openaev}
      />
      <RegistrationLearnMore serviceInstanceTag={ServiceInstanceTag.OpenAev} />
    </>
  );
};

export default Page;
