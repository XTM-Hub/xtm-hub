import { ShareableResourceDetailItem } from '@/components/service/document/ui/ShareableResourceDetailItem';
import { SimpleTooltip } from '@filigran/ui';
import { useTranslations } from 'next-intl';

export interface IntegrationCoverage {
  covered_object_types?: ReadonlyArray<string> | null;
  covered_sectors?: ReadonlyArray<string> | null;
  covered_regions?: ReadonlyArray<string> | null;
  coverage_inferred?: boolean | null;
}

const COVERAGE_ITEMS = [
  { field: 'covered_object_types', translationKey: 'CoveredObjectTypes' },
  { field: 'covered_sectors', translationKey: 'CoveredSectors' },
  { field: 'covered_regions', translationKey: 'CoveredRegions' },
] as const;

export const IntegrationCoverageDetails = ({
  coverage,
}: {
  coverage: IntegrationCoverage;
}) => {
  const t = useTranslations();
  const items = COVERAGE_ITEMS.map((item) => ({
    ...item,
    values: coverage[item.field] ?? [],
  })).filter(({ values }) => values.length > 0);

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      {items.map(({ field, translationKey, values }) => (
        <ShareableResourceDetailItem
          key={field}
          label={t(`Service.ShareableResources.Details.${translationKey}`)}>
          <span>{values.join(', ')}</span>
        </ShareableResourceDetailItem>
      ))}
      {coverage.coverage_inferred && (
        <SimpleTooltip
          title={t(
            'Service.ShareableResources.Details.CoverageInferredTooltip'
          )}>
          <span className="txt-sub-content underline decoration-dotted underline-offset-2 w-fit">
            {t('Service.ShareableResources.Details.CoverageInferred')}
          </span>
        </SimpleTooltip>
      )}
    </>
  );
};
