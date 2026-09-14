import { portalGraphqlClient } from '@/lib/graphql-client';
import { toast } from '@filigran/ui';
import { featureVotingKeys } from '@graphql/feature-voting/feature-voting.keys';
import { useFeatureVoteMutation } from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

/**
 * Casts a vote for a feature. Shared by the manual vote click on the private
 * page and the auto-vote fired after a visitor is redirected there from the
 * public page, so both paths get the same success/error handling.
 */
export const useFeatureVote = () => {
  const t = useTranslations();
  const queryClient = useQueryClient();

  return useFeatureVoteMutation(portalGraphqlClient, {
    onSuccess: () => {
      // A vote moves the one vote allowed per product, so the whole round has
      // to be refetched for the previously voted feature to lose its badge.
      queryClient.invalidateQueries({
        queryKey: featureVotingKeys.currentAll(),
      });
      toast({
        title: t('FeatureVoting.VoteRecordedTitle'),
        description: t('FeatureVoting.VoteRecordedDescription'),
      });
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : 'UnknownError';
      toast({
        variant: 'destructive',
        title: t('Utils.Error'),
        description: <>{t(`Error.Server.${errorMessage}`)}</>,
      });
    },
  });
};
