import { PlatformMetadataMapping } from '@/components/registration/PlatformIdentifierMapping';
import {
  getSaasPlatformMetadata,
  getSaasPlatformProductName,
  getSaasPlatformServicePath,
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

describe('getSaasPlatformProductName', () => {
  it.each([
    [ServiceDefinitionIdentifier.OpenctiRegistration, 'OpenCTI'],
    [ServiceDefinitionIdentifier.OpenaevRegistration, 'OpenAEV'],
    [ServiceDefinitionIdentifier.XtmoneRegistration, 'XTM One'],
  ])(
    'should return the product name of a %s platform',
    (identifier, expected) => {
      // Given a platform registered for a known product
      // When its product name is resolved
      const productName = getSaasPlatformProductName(identifier);

      // Then the product name is returned
      expect(productName).toBe(expected);
    }
  );

  it.each([
    [ServiceDefinitionIdentifier.Link],
    [ServiceDefinitionIdentifier.OpenctiIntegrations],
  ])(
    'should return an empty product name for a %s identifier',
    (identifier) => {
      // Given an identifier that does not match any registered product
      // When its product name is resolved
      const productName = getSaasPlatformProductName(identifier);

      // Then the product name is empty
      expect(productName).toBe('');
    }
  );
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
