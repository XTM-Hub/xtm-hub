'use client';

import { FeatureVoteButton } from '@/components/feature-voting/FeatureVoteButton';
import { DetailCard } from '@/components/ui/DetailCard';
import { useDetailParam } from '@/hooks/use-detail-param';
import { Badge } from '@filigran/ui/servers';
import { VotableFeaturePublicFragment } from '@graphql/generated';
import Image from 'next/image';

const BADGE_CLASS =
  'border-0 content-body-compact-medium bg-feedback-info-secondary-transparency';

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
              <Badge
                key={useCase.id}
                className={BADGE_CLASS}>
                {useCase.name}
              </Badge>
            ))}
          </div>
        )
      }
      footer={
        <div data-no-open-detail>
          <FeatureVoteButton
            featureId={feature.id}
            hasMyVote={feature.has_my_vote}
            isAuthenticated={isAuthenticated}
            className="w-full"
          />
        </div>
      }
    />
  );
};
