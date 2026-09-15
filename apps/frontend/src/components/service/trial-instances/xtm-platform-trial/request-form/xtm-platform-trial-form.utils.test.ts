import { buildOngoingTrialWarningParams } from '@/components/service/trial-instances/xtm-platform-trial/request-form/xtm-platform-trial-form.utils';
import { PlatformIdentifier } from '@graphql/generated';
import { describe, expect, it } from 'vitest';

const translateProduct = (platformIdentifier: PlatformIdentifier) =>
  ({
    [PlatformIdentifier.Opencti]: 'OpenCTI',
    [PlatformIdentifier.Openaev]: 'OpenAEV',
    [PlatformIdentifier.Xtmone]: 'XTM One',
  })[platformIdentifier];

describe('buildOngoingTrialWarningParams', () => {
  it.each`
    products                                                    | count | expectedProducts
    ${[]}                                                       | ${0}  | ${''}
    ${[PlatformIdentifier.Opencti]}                             | ${1}  | ${'OpenCTI'}
    ${[PlatformIdentifier.Openaev]}                             | ${1}  | ${'OpenAEV'}
    ${[PlatformIdentifier.Opencti, PlatformIdentifier.Openaev]} | ${2}  | ${'OpenCTI and OpenAEV'}
  `(
    'should build params for $products.length product(s)',
    ({ products, count, expectedProducts }) => {
      const result = buildOngoingTrialWarningParams(
        products,
        translateProduct,
        'en'
      );

      expect(result).toEqual({ count, products: expectedProducts });
    }
  );

  it('formats products according to the given locale', () => {
    const result = buildOngoingTrialWarningParams(
      [PlatformIdentifier.Opencti, PlatformIdentifier.Openaev],
      translateProduct,
      'fr'
    );

    expect(result).toEqual({ count: 2, products: 'OpenCTI et OpenAEV' });
  });
});
