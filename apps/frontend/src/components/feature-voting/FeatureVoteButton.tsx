'use client';

import { getFeatureVotingPrivatePath } from '@/components/feature-voting/feature-voting-path';
import { useFeatureVote } from '@/hooks/use-feature-vote';
import usePublicPath from '@/hooks/use-public-path';
import { buildSignupRedirect } from '@/utils/redirect';
import { CheckCircleIcon } from '@filigran/icon';
import { Button } from '@filigran/ui/servers';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

interface FeatureVoteButtonProps {
  featureId: string;
  serviceInstanceId: string;
  hasMyVote: boolean;
  isAuthenticated: boolean;
  className?: string;
}

export const FeatureVoteButton = ({
  featureId,
  serviceInstanceId,
  hasMyVote,
  isAuthenticated,
  className,
}: FeatureVoteButtonProps) => {
  const t = useTranslations();
  const router = useRouter();
  const isPublicPath = usePublicPath();
  const { mutate: commitVote, isPending } = useFeatureVote();

  const handleVote = () => {
    // Voting only ever happens on the private page: a visitor on the public
    // page is always sent there first, carrying the feature to vote for so
    // the private page can cast it once it lands (see FeatureVotingList).
    if (!isAuthenticated) {
      router.push(
        buildSignupRedirect(
          getFeatureVotingPrivatePath(serviceInstanceId, featureId)
        )
      );
      return;
    }
    if (isPublicPath) {
      router.push(getFeatureVotingPrivatePath(serviceInstanceId, featureId));
      return;
    }
    commitVote({ feature_id: featureId });
  };

  if (hasMyVote) {
    return (
      <Button
        variant="secondary"
        className={className}
        disabled>
        <CheckCircleIcon className="mr-s size-4" />
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
