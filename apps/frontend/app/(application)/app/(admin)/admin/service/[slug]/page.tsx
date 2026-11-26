import GuardCapacityComponent from '@/components/AdminGuard';
import PageLoader from './page-loader';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

const Page = async ({ params }: PageProps) => {
  const { slug } = await params;
  const id = decodeURIComponent(slug);
  return (
    <GuardCapacityComponent displayError>
      <PageLoader id={id} />
    </GuardCapacityComponent>
  );
};

export default Page;
