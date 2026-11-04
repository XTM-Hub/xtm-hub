import GuardCapacityComponent from '@/components/AdminGuard';
import { notFound } from 'next/navigation';
import PageLoader from './page-loader';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

const Page = async ({ params }: PageProps) => {
  const { slug } = await params;
  const encodedOrganizationId = slug;
  let id = encodedOrganizationId;
  try {
    id = decodeURIComponent(encodedOrganizationId);
  } catch {
    notFound();
  }
  return (
    <GuardCapacityComponent displayError>
      <PageLoader id={id} />
    </GuardCapacityComponent>
  );
};

export default Page;
