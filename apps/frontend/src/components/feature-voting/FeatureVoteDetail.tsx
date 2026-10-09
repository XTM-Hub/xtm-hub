import { FiligranProductMapping } from '@/components/epic/epic-item/FiligranProductMapping';
import { FeatureVoteButton } from '@/components/feature-voting/FeatureVoteButton';
import MarkdownRendererWithTheme from '@/components/ui/MarkdownRendererWithTheme';
import { Separator } from '@/components/ui/separator';
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
    <div className="markdown-content flex h-full min-h-0 flex-1 flex-col gap-m">
      <DialogTitle>{feature.title}</DialogTitle>
      <DialogDescription className="sr-only">
        {feature.short_description}
      </DialogDescription>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {feature.illustration_document_id && (
          <div className="relative mb-m h-48 w-full">
            <Image
              src={`/document/images/${serviceInstanceId}/${feature.illustration_document_id}`}
              alt={feature.title}
              fill
              className="rounded object-cover"
            />
          </div>
        )}
        <MarkdownRendererWithTheme source={feature.description} />
      </div>
      <Separator />
      <div className="flex flex-wrap items-center justify-between gap-m">
        <div className="flex flex-wrap items-center gap-m">
          <span className="flex items-center gap-s">
            {FiligranProductMapping[feature.product].logo}
            {FiligranProductMapping[feature.product].name}
          </span>
          {feature.use_cases.length > 0 && (
            <div className="flex flex-wrap items-center gap-s">
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
          featureId={feature.id}
          serviceInstanceId={serviceInstanceId}
          hasMyVote={feature.has_my_vote}
          isAuthenticated={isAuthenticated}
        />
      </div>
    </div>
  );
};
