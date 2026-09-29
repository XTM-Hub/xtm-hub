'use client';

import { FiligranProductMapping } from '@/components/epic/epic-item/FiligranProductMapping';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { Skeleton } from '@filigran/ui';
import {
  FiligranProduct,
  useVotingRoundRankingQuery,
  VotableFeatureAdminRowFragment,
} from '@graphql/generated';
import { votingRoundKeys } from '@graphql/voting-round/voting-round.keys';

const PRODUCT_ORDER: FiligranProduct[] = [
  FiligranProduct.Opencti,
  FiligranProduct.Openaev,
  FiligranProduct.Xtmone,
  FiligranProduct.Xtmhub,
];

interface RankedFeature {
  feature: VotableFeatureAdminRowFragment;
  vote_count: number;
}

export const VotingRoundResults = ({ roundId }: { roundId: string }) => {
  const t = useTranslate();
  const variables = { id: roundId };
  const { data, isLoading } = useVotingRoundRankingQuery(
    portalGraphqlClient,
    variables,
    { queryKey: votingRoundKeys.ranking(variables) }
  );

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  const results = data?.votingRoundResults;
  if (!results) {
    return null;
  }

  // The ranking is global, but a user votes once per product: only a
  // per-product ranking is meaningful.
  const sections = PRODUCT_ORDER.map((product) => ({
    product,
    ranked: (results.results as RankedFeature[]).filter(
      ({ feature }) => feature.product === product
    ),
  })).filter((section) => section.ranked.length > 0);

  return (
    <section className="flex flex-col gap-m">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold">
          {t('VotingRound.Results.Title')}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t('VotingRound.Results.TotalVoters', {
            count: results.total_voters,
          })}
        </p>
      </div>
      {sections.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t('VotingRound.Results.Empty')}
        </p>
      ) : (
        sections.map(({ product, ranked }) => (
          <div
            key={product}
            className="flex flex-col gap-s">
            <div className="flex items-center gap-s">
              {FiligranProductMapping[product].logo}
              <h3 className="font-semibold">
                {FiligranProductMapping[product].name}
              </h3>
            </div>
            <ol className="flex flex-col gap-xs">
              {ranked.map((result, index) => (
                <li
                  key={result.feature.id}
                  className="flex items-center gap-m rounded bg-elevation-background-layer-1 p-s">
                  <span className="w-6 text-center text-muted-foreground">
                    {index + 1}
                  </span>
                  <span className="flex-1 truncate">
                    {result.feature.title}
                  </span>
                  {!result.feature.active && (
                    <span className="text-muted-foreground text-xs">
                      {t('VotingRound.Results.InactiveFeature')}
                    </span>
                  )}
                  <span className="font-semibold">{result.vote_count}</span>
                </li>
              ))}
            </ol>
          </div>
        ))
      )}
    </section>
  );
};
