import { FiligranProductMapping } from '@/components/epic/epic-item/FiligranProductMapping';
import { FeatureVoteButton } from '@/components/feature-voting/FeatureVoteButton';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { Separator } from '@/components/ui/separator';
import { analyticsFeature } from '@/lib/analytics/analytics.context';
import { Chip, DialogDescription, DialogTitle } from '@filigran/design-system';
import { VotableFeaturePublicFragment } from '@graphql/generated';
import Image from 'next/image';

interface FeatureVoteDetailProps {
  feature: VotableFeaturePublicFragment;
  serviceInstanceId: string;
  isAuthenticated: boolean;
}

export const FeatureVoteDetail = ({
  feature,
  serviceInstanceId,
  isAuthenticated,
}: FeatureVoteDetailProps) => {
  return (
    <div
      {...analyticsFeature(feature.title)}
      className="flex h-full min-h-0 flex-1 flex-col gap-3">
      <DialogTitle>{feature.title}</DialogTitle>
      <DialogDescription className="sr-only">
        {feature.short_description}
      </DialogDescription>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {feature.illustration_document_id && (
          <div className="relative mb-3 h-48 w-full">
            <Image
              src={`/document/images/${serviceInstanceId}/${feature.illustration_document_id}`}
              alt={feature.title}
              fill
              className="rounded object-cover"
            />
          </div>
        )}
        <MarkdownRenderer
          source={feature.description}
          linkAnalyticsId="roadmap_description_link_open"
        />
      </div>
      <Separator />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2">
            {FiligranProductMapping[feature.product].logo}
            {FiligranProductMapping[feature.product].name}
          </span>
          {feature.use_cases.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {feature.use_cases.map((useCase) => (
                <Chip
                  key={useCase.id}
                  label={useCase.name}
                />
              ))}
            </div>
          )}
        </div>
        <FeatureVoteButton
          feature={feature}
          serviceInstanceId={serviceInstanceId}
          hasMyVote={feature.has_my_vote}
          isAuthenticated={isAuthenticated}
        />
      </div>
    </div>
  );
};
