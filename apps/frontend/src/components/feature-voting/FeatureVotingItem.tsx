'use client';

import { FeatureVoteCard } from '@/components/feature-voting/FeatureVoteCard';
import { FeatureVoteDetail } from '@/components/feature-voting/FeatureVoteDetail';
import { useDetailParam } from '@/hooks/use-detail-param';
import { Dialog, DialogContent } from '@filigran/ui';
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
        <DialogContent className="flex h-[80vh] max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden p-0">
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
