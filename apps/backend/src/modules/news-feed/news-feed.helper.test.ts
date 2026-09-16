import { describe, expect, it } from 'vitest';
import {
  IntegrationType,
  NewsFeedItemType,
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
} from '../../__generated__/resolvers-types';
import Document from '../../model/kanel/public/Document';
import {
  doesPlatformSupportNewsFeed,
  NewsFeedHelper,
} from './news-feed.helper';

describe('news-feed.helper', () => {
  describe('doesPlatformSupportNewsFeed', () => {
    it.each`
      version             | expected
      ${'7.260527.0'}     | ${true}
      ${'7.260529.0'}     | ${true}
      ${'8.0.0'}          | ${true}
      ${'7.260801.0-lts'} | ${true}
      ${'7.260526.0'}     | ${false}
      ${'7.260512.0'}     | ${false}
      ${'6.8.0'}          | ${false}
      ${'1.0.0'}          | ${false}
    `(
      'returns $expected for OpenCTI version $version',
      ({ version, expected }) => {
        expect(
          doesPlatformSupportNewsFeed(PlatformIdentifier.Opencti, version)
        ).toBe(expected);
      }
    );

    it('returns false for a missing version', () => {
      expect(
        doesPlatformSupportNewsFeed(PlatformIdentifier.Opencti, null)
      ).toBe(false);
    });

    it('returns false for an invalid version', () => {
      expect(
        doesPlatformSupportNewsFeed(PlatformIdentifier.Opencti, 'not-a-version')
      ).toBe(false);
    });

    it('returns true when no minimum is configured for the identifier', () => {
      expect(
        doesPlatformSupportNewsFeed(PlatformIdentifier.Openaev, '1.0.0')
      ).toBe(true);
    });
  });

  describe('getNewsFeedConfiguration', () => {
    it.each`
      identifier                                             | expected | description
      ${ServiceDefinitionIdentifier.OpenctiCustomDashboards} | ${true}  | ${'configured service definition'}
      ${ServiceDefinitionIdentifier.OpenctiPlaybooks}        | ${true}  | ${'playbooks service definition'}
      ${ServiceDefinitionIdentifier.OpenctiIntegrations}     | ${true}  | ${'integrations service definition'}
      ${ServiceDefinitionIdentifier.OpenctiRegistration}     | ${false} | ${'registration identifier'}
      ${ServiceDefinitionIdentifier.Vault}                   | ${false} | ${'vault identifier'}
      ${ServiceDefinitionIdentifier.OpenaevScenarios}        | ${false} | ${'openaev scenarios identifier'}
    `(
      'should return a configuration $expected for $description ($identifier)',
      ({
        identifier,
        expected,
      }: {
        identifier: ServiceDefinitionIdentifier;
        expected: boolean;
      }) => {
        const document = { id: 'doc-id' } as Document;
        const configuration = NewsFeedHelper.getNewsFeedConfiguration(
          identifier,
          document
        );
        expect(configuration !== undefined).toBe(expected);
      }
    );

    it('should return undefined for an integration document that is a connector', () => {
      const document = {
        id: 'doc-id',
        integration_type: IntegrationType.Connector,
      } as Document & { integration_type: IntegrationType };

      const configuration = NewsFeedHelper.getNewsFeedConfiguration(
        ServiceDefinitionIdentifier.OpenctiIntegrations,
        document
      );

      expect(configuration).toBeUndefined();
    });

    it('should return a configuration for an integration document that is not a connector', () => {
      const document = {
        id: 'doc-id',
        integration_type: IntegrationType.CsvFeed,
      } as Document & { integration_type: IntegrationType };

      const configuration = NewsFeedHelper.getNewsFeedConfiguration(
        ServiceDefinitionIdentifier.OpenctiIntegrations,
        document
      );

      expect(configuration).toEqual({
        newsFeedType: NewsFeedItemType.ResourceIntegration,
        platformIdentifier: PlatformIdentifier.Opencti,
      });
    });
  });
});
