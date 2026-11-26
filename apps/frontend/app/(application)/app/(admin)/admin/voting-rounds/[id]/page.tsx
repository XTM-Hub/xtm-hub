'use client';

import { VotingRoundDetail } from '@/components/admin/voting-round/VotingRoundDetail';
import GuardCapacityComponent from '@/components/AdminGuard';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { APP_PATH } from '@/utils/path/constant';
import { PortalCapability } from '@graphql/generated';
import { useParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

const breadcrumbValue = [
  { label: 'MenuLinks.Settings' },
  {
    label: 'MenuLinks.VotingRound',
    href: `/${APP_PATH}/admin/voting-rounds`,
  },
];

const Page = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <GuardCapacityComponent
      portalCapabilityRestriction={[PortalCapability.Bypass]}
      displayError>
      <BreadcrumbNav value={breadcrumbValue} />
      <VotingRoundDetail roundId={id} />
    </GuardCapacityComponent>
  );
};

export default Page;
