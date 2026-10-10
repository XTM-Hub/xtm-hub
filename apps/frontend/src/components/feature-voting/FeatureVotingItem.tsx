'use client';

import { FeatureVoteCard } from '@/components/feature-voting/FeatureVoteCard';
import { FeatureVoteDetail } from '@/components/feature-voting/FeatureVoteDetail';
import { useDetailParam } from '@/hooks/use-detail-param';
import { Dialog, DialogContent } from '@filigran/design-system';
import { VotableFeaturePublicFragment } from '@graphql/generated';

interface FeatureVotingItemProps {
  feature: VotableFeaturePublicFragment;
  serviceInstanceId: string;
  isAuthenticated: boolean;
}

export const FeatureVotingItem = ({
  feature,
  serviceInstanceId,
  isAuthenticated,
}: FeatureVotingItemProps) => {
  const { isOpen, close } = useDetailParam('featureId', feature.id);

  return (
    <li className="h-full">
      <FeatureVoteCard
        feature={feature}
        serviceInstanceId={serviceInstanceId}
        isAuthenticated={isAuthenticated}
      />
      <Dialog
        open={isOpen}
        onOpenChange={(open) => !open && close()}>
        <DialogContent size="lg">
          <FeatureVoteDetail
            feature={feature}
            serviceInstanceId={serviceInstanceId}
            isAuthenticated={isAuthenticated}
          />
        </DialogContent>
      </Dialog>
    </li>
  );
};
