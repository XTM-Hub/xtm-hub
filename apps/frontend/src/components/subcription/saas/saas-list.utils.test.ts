import { PlatformMetadataMapping } from '@/components/registration/PlatformIdentifierMapping';
import {
  getContractEndStatus,
  getSaasPlatformMetadata,
  getSaasPlatformServicePath,
  getSaasProductName,
  isSlaMissed,
  isStorageUsageHigh,
} from '@/components/subcription/saas/saas-list.utils';
import {
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
} from '@graphql/generated';

describe('getSaasPlatformMetadata', () => {
  it.each([
    [
      ServiceDefinitionIdentifier.OpenctiRegistration,
      PlatformIdentifier.Opencti,
    ],
    [
      ServiceDefinitionIdentifier.OpenaevRegistration,
      PlatformIdentifier.Openaev,
    ],
    [ServiceDefinitionIdentifier.XtmoneRegistration, PlatformIdentifier.Xtmone],
  ])(
    'should return the metadata of the product of a %s platform',
    (identifier, platformIdentifier) => {
      // Given a platform registered for a known product
      // When its metadata is resolved
      const metadata = getSaasPlatformMetadata(identifier);

      // Then the metadata of its product is returned
      expect(metadata).toBe(PlatformMetadataMapping[platformIdentifier]);
    }
  );

  it('should return no metadata for an identifier that is not a product', () => {
    // Given an identifier that does not match any registered product
    // When its metadata is resolved
    const metadata = getSaasPlatformMetadata(ServiceDefinitionIdentifier.Link);

    // Then no metadata is returned
    expect(metadata).toBeUndefined();
  });
});

describe('getSaasPlatformServicePath', () => {
  it('should return the service page path of the platform service instance', () => {
    // Given a saas platform registered on a service instance
    const platform = {
      identifier: ServiceDefinitionIdentifier.OpenctiRegistration,
      service_instance_id:
        'U2VydmljZUluc3RhbmNlOjY5NzAwZWFlLTM2YWYtNDJmZi1hMThiLTljMzBkNGMzODU5Mg==',
    };

    // When its service page path is built
    const path = getSaasPlatformServicePath(platform);

    // Then it points to the service instance page of its product
    expect(path).toBe(
      '/app/service/opencti_registration/U2VydmljZUluc3RhbmNlOjY5NzAwZWFlLTM2YWYtNDJmZi1hMThiLTljMzBkNGMzODU5Mg=='
    );
  });
});

describe('getContractEndStatus', () => {
  const NOW = '2026-10-28T12:00:00.000Z';

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(NOW) });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each`
    description                    | endDate                       | daysLeft | isEndingSoon
    ${'ends in more than 90 days'} | ${'2027-03-15T12:00:00.000Z'} | ${138}   | ${false}
    ${'ends in exactly 90 days'}   | ${'2027-01-26T12:00:00.000Z'} | ${90}    | ${false}
    ${'ends in 89 days'}           | ${'2027-01-25T12:00:00.000Z'} | ${89}    | ${true}
    ${'ends today'}                | ${NOW}                        | ${0}     | ${true}
    ${'is already over'}           | ${'2026-10-01T12:00:00.000Z'} | ${0}     | ${true}
  `(
    'should return $daysLeft days left, ending soon $isEndingSoon, for a contract that $description',
    ({ endDate, daysLeft, isEndingSoon }) => {
      // Given a contract end date
      // When its status is computed
      const status = getContractEndStatus(endDate);

      // Then the days left and whether the contract ends soon are returned
      expect(status).toEqual({ daysLeft, isEndingSoon });
    }
  );
});

describe('getSaasProductName', () => {
  it.each`
    product   | name
    ${'OCTI'} | ${'OpenCTI'}
    ${'OAEV'} | ${'OpenAEV'}
    ${'ONE'}  | ${'XTM One'}
    ${'octi'} | ${'OpenCTI'}
  `('should return $name for the $product product', ({ product, name }) => {
    // Given a product code sent by the SaaS Manager
    // When its name is resolved
    const productName = getSaasProductName(product);

    // Then the full name of the product is returned
    expect(productName).toBe(name);
  });

  it('should return the code of a product the Hub does not know', () => {
    // Given a product code the Hub has no name for
    // When its name is resolved
    const productName = getSaasProductName('OTHER');

    // Then the code is returned as is
    expect(productName).toBe('OTHER');
  });
});

describe('isStorageUsageHigh', () => {
  it.each`
    percent | isHigh
    ${57}   | ${false}
    ${80}   | ${false}
    ${80.1} | ${true}
    ${100}  | ${true}
  `(
    'should return $isHigh for a storage used at $percent %',
    ({ percent, isHigh }) => {
      // Given a storage usage
      // When it is rated
      const high = isStorageUsageHigh(percent);

      // Then it is high only above 80 % of the capacity
      expect(high).toBe(isHigh);
    }
  );
});

describe('isSlaMissed', () => {
  it.each`
    availability | isMissed
    ${99.71}     | ${true}
    ${99.97}     | ${true}
    ${99.975}    | ${false}
    ${99.98}     | ${false}
    ${100}       | ${false}
  `(
    'should return $isMissed for an availability of $availability %',
    ({ availability, isMissed }) => {
      // Given an availability sent by the SaaS Manager
      // When it is rated against the 99.98 % the contract commits to
      const missed = isSlaMissed(availability);

      // Then it is missed only when it shows under 99.98 %
      expect(missed).toBe(isMissed);
    }
  );
});
