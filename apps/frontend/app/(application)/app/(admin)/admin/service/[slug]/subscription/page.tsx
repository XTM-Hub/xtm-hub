import GuardCapacityComponent from '@/components/AdminGuard';
import SubscriptionSlug from '@/components/subcription/[slug]/SubscriptionSlug';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

const Page = async ({ params }: PageProps) => {
  const { slug } = await params;
  const id = decodeURIComponent(slug);
  return (
    <GuardCapacityComponent displayError>
      <SubscriptionSlug subscriptionId={id} />
    </GuardCapacityComponent>
  );
};

export default Page;
