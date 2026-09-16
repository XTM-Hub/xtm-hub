import { PlatformIdentifier } from '@graphql/generated';

export interface OngoingTrialWarningParams {
  count: number;
  products: string;
  [key: string]: string | number;
}

/**
 * Builds the translation params describing which products have an ongoing
 * trial, so the warning sentence can list them (e.g. "OpenCTI",
 * "OpenCTI and OpenAEV") and pick the right plural form.
 */
export const buildOngoingTrialWarningParams = (
  ongoingTrialProducts: PlatformIdentifier[],
  translateProduct: (platformIdentifier: PlatformIdentifier) => string,
  locale: string
): OngoingTrialWarningParams => {
  const productNames = ongoingTrialProducts.map(translateProduct);
  const listFormatter = new Intl.ListFormat(locale, {
    style: 'long',
    type: 'conjunction',
  });

  return {
    count: productNames.length,
    products: listFormatter.format(productNames),
  };
};
