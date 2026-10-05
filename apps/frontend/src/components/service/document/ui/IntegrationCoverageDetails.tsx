import { ShareableResourceDetailItem } from '@/components/service/document/ui/ShareableResourceDetailItem';
import { useCoverageObjectTypeLabel } from '@/components/service/form/UseCoverageObjectTypes';
import { useTranslate } from '@/hooks/use-translate';
import { SimpleTooltip } from '@filigran/ui';

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
  const t = useTranslate();
  const objectTypeLabel = useCoverageObjectTypeLabel();
  const items = COVERAGE_ITEMS.map((item) => ({
    ...item,
    values:
      item.field === 'covered_object_types'
        ? (coverage[item.field] ?? []).map(objectTypeLabel)
        : (coverage[item.field] ?? []),
  })).filter(({ values }) => values.length > 0);

  // A declared empty coverage says nothing; an inference that found nothing is a state the reader must see
  if (items.length === 0 && !coverage.coverage_inferred) {
    return null;
  }
  const inferredEmpty = items.length === 0;

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
            inferredEmpty
              ? 'Service.ShareableResources.Details.CoverageInferredEmptyTooltip'
              : 'Service.ShareableResources.Details.CoverageInferredTooltip'
          )}>
          <span className="txt-sub-content underline decoration-dotted underline-offset-2 w-fit">
            {t(
              inferredEmpty
                ? 'Service.ShareableResources.Details.CoverageInferredEmpty'
                : 'Service.ShareableResources.Details.CoverageInferred'
            )}
          </span>
        </SimpleTooltip>
      )}
    </>
  );
};
