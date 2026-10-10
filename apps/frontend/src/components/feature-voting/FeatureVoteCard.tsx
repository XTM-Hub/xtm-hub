'use client';

import { FeatureVoteButton } from '@/components/feature-voting/FeatureVoteButton';
import { DetailCard } from '@/components/ui/DetailCard';
import { useDetailParam } from '@/hooks/use-detail-param';
import { Chip } from '@filigran/design-system';
import { VotableFeaturePublicFragment } from '@graphql/generated';
import Image from 'next/image';

interface FeatureVoteCardProps {
  feature: VotableFeaturePublicFragment;
  serviceInstanceId: string;
  isAuthenticated: boolean;
}

export const FeatureVoteCard = ({
  feature,
  serviceInstanceId,
  isAuthenticated,
}: FeatureVoteCardProps) => {
  const { open: openDetail } = useDetailParam('featureId', feature.id);

  return (
    <DetailCard
      onOpenDetail={openDetail}
      title={feature.title}
      description={feature.short_description}
      media={
        feature.illustration_document_id && (
          <div className="relative h-32 w-full shrink-0">
            <Image
              src={`/document/images/${serviceInstanceId}/${feature.illustration_document_id}`}
              alt={feature.title}
              fill
              className="object-cover"
            />
          </div>
        )
      }
      extra={
        feature.use_cases.length > 0 && (
          <div className="flex flex-wrap items-center gap-s">
            {feature.use_cases.map((useCase) => (
              <Chip
                key={useCase.id}
                label={useCase.name}
              />
            ))}
          </div>
        )
      }
      footer={
        <div data-no-open-detail>
          <FeatureVoteButton
            featureId={feature.id}
            serviceInstanceId={serviceInstanceId}
            hasMyVote={feature.has_my_vote}
            isAuthenticated={isAuthenticated}
            className="w-full"
          />
        </div>
      }
    />
  );
};
