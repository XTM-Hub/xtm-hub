import { useTranslate } from '@/hooks/use-translate';
import { Chip } from '@filigran/design-system';
import { VotingRoundStatus } from '@graphql/generated';

export const VotingRoundStatusBadge = ({
  status,
}: {
  status: VotingRoundStatus;
}) => {
  const t = useTranslate();
  return <Chip label={t(`VotingRound.Status.${status}`)} />;
};
