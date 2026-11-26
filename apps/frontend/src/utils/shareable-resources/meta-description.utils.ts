import {
  SHAREABLE_RESOURCE_PRODUCT_MAPPING,
  ShareableResourceType,
} from '@/utils/shareable-resources/shareable-resources.types';

// Same rules as the backend (document.helper.ts): they apply to the generated meta-description, not to the summary.
export const META_DESCRIPTION_MIN_LENGTH = 120;
export const META_DESCRIPTION_MAX_LENGTH = 160;
const LONG_DASH = /[–—]/;

/** The resource type named in the meta-description: every integration subtype is an `Integration`. */
export const META_DESCRIPTION_TYPE_LABEL_MAPPING = {
  [ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD]: 'Dashboard',
  [ShareableResourceType.OPENCTI_CUSTOM_VIEW]: 'Custom View',
  [ShareableResourceType.OPENCTI_INTEGRATION]: 'Integration',
  [ShareableResourceType.OPENCTI_PLAYBOOK]: 'Playbook',
  [ShareableResourceType.OPENAEV_SCENARIO]: 'Scenario',
} as const satisfies Record<ShareableResourceType, string>;

/** Same codes as the errors the backend returns, translated under `Error.Server`. */
export enum MetaDescriptionErrorCode {
  REQUIRED = 'META_DESCRIPTION_REQUIRED',
  TOO_SHORT = 'META_DESCRIPTION_TOO_SHORT',
  TOO_LONG = 'META_DESCRIPTION_TOO_LONG',
  INVALID_DASH = 'META_DESCRIPTION_INVALID_DASH',
  MATCHES_TITLE = 'META_DESCRIPTION_MATCHES_TITLE',
}

interface MetaDescriptionParts {
  product: string;
  typeLabel: string;
  summary: string;
}

/** `{Product} {TypeLabel}: {summary}.`, without doubling the period the summary may already end with. */
export const buildMetaDescription = ({
  product,
  typeLabel,
  summary,
}: MetaDescriptionParts) => {
  const trimmedSummary = summary.trim();
  const sentence = trimmedSummary.endsWith('.')
    ? trimmedSummary
    : `${trimmedSummary}.`;
  return `${product} ${typeLabel}: ${sentence}`;
};

/** The meta-description published for a resource of this type, from the summary its author entered. */
export const buildResourceMetaDescription = (
  resourceType: ShareableResourceType,
  summary: string
) =>
  buildMetaDescription({
    product: SHAREABLE_RESOURCE_PRODUCT_MAPPING[resourceType],
    typeLabel: META_DESCRIPTION_TYPE_LABEL_MAPPING[resourceType],
    summary,
  });

interface MetaDescriptionValidationInput {
  resourceType: ShareableResourceType;
  summary: string;
  /** The name of the resource, its page h1. */
  title: string;
}

/**
 * The first rule the generated meta-description breaks, or null when it is valid. An empty title is not compared:
 * every text starts with it, and the name field reports it on its own.
 */
export const validateMetaDescription = ({
  resourceType,
  summary,
  title,
}: MetaDescriptionValidationInput): MetaDescriptionErrorCode | null => {
  if (summary.trim().length === 0) {
    return MetaDescriptionErrorCode.REQUIRED;
  }

  const metaDescription = buildResourceMetaDescription(resourceType, summary);
  if (metaDescription.length < META_DESCRIPTION_MIN_LENGTH) {
    return MetaDescriptionErrorCode.TOO_SHORT;
  }
  if (metaDescription.length > META_DESCRIPTION_MAX_LENGTH) {
    return MetaDescriptionErrorCode.TOO_LONG;
  }
  if (LONG_DASH.test(metaDescription)) {
    return MetaDescriptionErrorCode.INVALID_DASH;
  }

  const normalizedTitle = title.trim().toLowerCase();
  // A text equal to the title also starts with it.
  if (
    normalizedTitle.length > 0 &&
    metaDescription.toLowerCase().startsWith(normalizedTitle)
  ) {
    return MetaDescriptionErrorCode.MATCHES_TITLE;
  }

  return null;
};
