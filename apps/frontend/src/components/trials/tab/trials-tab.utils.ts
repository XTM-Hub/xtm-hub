import {
  TRIALS_PRODUCT_ORDER,
  TRIALS_TAB_CONFIG,
  TrialsTabType,
  trialsRegionKey,
} from '@/components/trials/trials.const';
import {
  DeploymentRequestDeploymentType,
  DeploymentRequestFilter,
  DeploymentRequestFilterKey,
  DeploymentRequestPlatformRegion,
  TrialsProductFragment,
} from '@graphql/generated';

const productRank = (product: TrialsProductFragment): number => {
  const rank = TRIALS_PRODUCT_ORDER.findIndex(
    (platformIdentifier) => platformIdentifier === product.platform_identifier
  );
  return rank === -1 ? TRIALS_PRODUCT_ORDER.length : rank;
};

export const sortProducts = (
  products: readonly TrialsProductFragment[]
): TrialsProductFragment[] =>
  [...products].sort((left, right) => productRank(left) - productRank(right));

export const buildTrialsFilters = (
  type: TrialsTabType
): DeploymentRequestFilter[] => [
  {
    key: DeploymentRequestFilterKey.Type,
    value: [DeploymentRequestDeploymentType.Bundle],
  },
  {
    key: DeploymentRequestFilterKey.HubStatus,
    value: TRIALS_TAB_CONFIG[type].statuses,
  },
];

/**
 * The regions a search term points at, so the trials list can match a region
 * by its displayed label ("Europe") or by its raw code ("eu_west").
 */
export const matchSearchRegions = (
  term: string | null,
  t: (key: string) => string
): DeploymentRequestPlatformRegion[] => {
  const needle = term?.trim().toLowerCase();
  if (!needle) {
    return [];
  }
  return Object.values(DeploymentRequestPlatformRegion).filter(
    (region) =>
      region.toLowerCase().includes(needle) ||
      t(trialsRegionKey(region)).toLowerCase().includes(needle)
  );
};

/**
 * Format a cancellation reason for display in the trials dashboard.
 *
 * Stored values can be:
 * - A known keyword (`value`, `compatibility`, `complexity`, `legal-security`, `expertise`)
 *   → translated via `Service.Trials.CancellationReason.<keyword>`
 * - `"other"` (migrated) or `"Other"` (new, no free text)
 *   → translated via `Service.Trials.Cancellation.ConfirmationForm.CancellationReasonOther`
 * - `"Other: <free text>"` (user typed a custom reason)
 *   → translated "Other" label + `: <free text>`
 */

const OTHER_PREFIX = 'Other:';

export const formatCancellationReason = (
  reason: string,
  t: (key: string) => string
): string => {
  // Handle "Other: <free text>" format produced by SelectWithEditableField
  if (reason.startsWith(OTHER_PREFIX)) {
    const freeText = reason.slice(OTHER_PREFIX.length).trim();
    const otherLabel = t(
      'Service.Trials.Cancellation.ConfirmationForm.CancellationReasonOther'
    );
    return freeText ? `${otherLabel}: ${freeText}` : otherLabel;
  }

  // Handle plain "other" (migrated) or "Other" (new, no free text)
  if (reason.toLowerCase() === 'other') {
    return t(
      'Service.Trials.Cancellation.ConfirmationForm.CancellationReasonOther'
    );
  }

  // Standard reasons with a matching translation key
  return t(`Service.Trials.CancellationReason.${reason}`);
};
