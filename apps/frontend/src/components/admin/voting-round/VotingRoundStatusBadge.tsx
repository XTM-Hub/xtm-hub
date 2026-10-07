import { useTranslate } from '@/hooks/use-translate';
import { Chip, type ChipSeverity } from '@filigran/design-system';
import { VotingRoundStatus } from '@graphql/generated';

const BADGE_VARIANT: Record<VotingRoundStatus, ChipSeverity> = {
  [VotingRoundStatus.Draft]: 'medium',
  [VotingRoundStatus.Open]: 'low',
  [VotingRoundStatus.Closed]: 'neutral',
};

export const VotingRoundStatusBadge = ({
  status,
}: {
  status: VotingRoundStatus;
}) => {
  const t = useTranslate();
  return (
    <Chip
      label={t(`VotingRound.Status.${status}`)}
      severity={BADGE_VARIANT[status]}
    />
  );
};
