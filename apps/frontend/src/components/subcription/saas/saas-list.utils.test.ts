import { PlatformMetadataMapping } from '@/components/registration/PlatformIdentifierMapping';
import {
  getContractDaysLeft,
  getHealthIssueRatio,
  getSaasPlatformMetadata,
  getSaasPlatformServicePath,
  getSaasProductName,
} from '@/components/subcription/saas/saas-list.utils';
import {
  PlatformIdentifier,
  SaasPlatformHealthIssue,
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
  it('should return the service page path of the platform service instance, opened from the CSM board', () => {
    // Given a saas platform registered on a service instance
    const platform = {
      identifier: ServiceDefinitionIdentifier.OpenctiRegistration,
      service_instance_id:
        'U2VydmljZUluc3RhbmNlOjY5NzAwZWFlLTM2YWYtNDJmZi1hMThiLTljMzBkNGMzODU5Mg==',
    };

    // When its service page path is built
    const path = getSaasPlatformServicePath(platform);

    // Then it points to the service instance page of its product, which leads back to the CSM board
    expect(path).toBe(
      '/app/service/opencti_registration/U2VydmljZUluc3RhbmNlOjY5NzAwZWFlLTM2YWYtNDJmZi1hMThiLTljMzBkNGMzODU5Mg==?from=csm-board'
    );
  });
});

describe('getContractDaysLeft', () => {
  const NOW = '2026-10-28T12:00:00.000Z';

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(NOW) });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each`
    description           | endDate                       | daysLeft
    ${'ends in 90 days'}  | ${'2027-01-26T12:00:00.000Z'} | ${90}
    ${'ends in 89 days'}  | ${'2027-01-25T12:00:00.000Z'} | ${89}
    ${'ends later today'} | ${'2026-10-28T13:00:00.000Z'} | ${1}
  `(
    'should return $daysLeft days left for a contract that $description',
    ({ endDate, daysLeft }) => {
      // Given a contract end date
      // When the days left are counted
      const days = getContractDaysLeft(endDate);

      // Then every started day counts
      expect(days).toBe(daysLeft);
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

describe('getHealthIssueRatio', () => {
  const platform = {
    sla_cmtd: 0.9971,
    storage: {
      es_used_size: { percent: 85 },
      s3_used_size: { percent: 93 },
    },
  };

  it.each`
    issue                                   | ratio
    ${SaasPlatformHealthIssue.Availability} | ${0.9971}
    ${SaasPlatformHealthIssue.Database}     | ${0.85}
    ${SaasPlatformHealthIssue.FileStorage}  | ${0.93}
  `('should return $ratio for the $issue issue', ({ issue, ratio }) => {
    // Given a platform the SaaS Manager measured
    // When the measure behind one of its issues is read
    const issueRatio = getHealthIssueRatio(platform, issue);

    // Then it is a ratio, whatever unit the measure is sent in
    expect(issueRatio).toBe(ratio);
  });

  it('should return null for the issue of a storage without usage', () => {
    // Given a platform without any storage measure
    // When the measure behind its database issue is read
    const issueRatio = getHealthIssueRatio(
      { sla_cmtd: null, storage: null },
      SaasPlatformHealthIssue.Database
    );

    // Then there is none
    expect(issueRatio).toBeNull();
  });
});
