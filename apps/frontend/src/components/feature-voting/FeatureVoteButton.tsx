'use client';

import { getFeatureVotingPrivatePath } from '@/components/feature-voting/feature-voting-path';
import { useFeatureVote } from '@/hooks/use-feature-vote';
import usePublicPath from '@/hooks/use-public-path';
import { useTranslate } from '@/hooks/use-translate';
import { buildSignupRedirect } from '@/utils/redirect';
import { CheckCircleIcon } from '@filigran/icon';

import { Button } from '@filigran/design-system';
import { VotableFeaturePublicFragment } from '@graphql/generated';
import { useRouter } from 'next/navigation';

interface FeatureVoteButtonProps {
  feature: Pick<VotableFeaturePublicFragment, 'id' | 'title'>;
  serviceInstanceId: string;
  hasMyVote: boolean;
  isAuthenticated: boolean;
  className?: string;
}

export const FeatureVoteButton = ({
  feature,
  serviceInstanceId,
  hasMyVote,
  isAuthenticated,
  className,
}: FeatureVoteButtonProps) => {
  const t = useTranslate();
  const router = useRouter();
  const isPublicPath = usePublicPath();
  const { vote, isPending } = useFeatureVote();

  const handleVote = () => {
    // Voting only ever happens on the private page: a visitor on the public
    // page is always sent there first, carrying the feature to vote for so
    // the private page can cast it once it lands (see FeatureVotingList).
    if (!isAuthenticated) {
      router.push(
        buildSignupRedirect(
          getFeatureVotingPrivatePath(serviceInstanceId, feature.id)
        )
      );
      return;
    }
    if (isPublicPath) {
      router.push(getFeatureVotingPrivatePath(serviceInstanceId, feature.id));
      return;
    }
    vote(feature);
  };

  if (hasMyVote) {
    return (
      <Button
        priority="secondary"
        className={className}
        startIcon={<CheckCircleIcon className="size-4" />}
        disabled>
        {t('FeatureVoting.Voted')}
      </Button>
    );
  }

  return (
    <Button
      className={className}
      onClick={handleVote}
      disabled={isPending}>
      {t('FeatureVoting.Vote')}
    </Button>
  );
};
