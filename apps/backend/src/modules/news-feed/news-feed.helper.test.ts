import config from 'config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  IntegrationType,
  NewsFeedItemType,
  NewsFeedUtmContent,
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
} from '../../__generated__/resolvers-types';
import Document from '../../model/kanel/public/Document';
import { RequiredPlatformVersions } from '../../utils/required-platform-version';
import {
  doesPlatformSupportBlogpostNewsFeed,
  doesPlatformSupportNewsFeed,
  NewsFeedHelper,
} from './news-feed.helper';
import {
  NEWS_FEED_REDIRECT_PATH_PREFIX,
  NEWS_FEED_UTM_CONTENT_FALLBACK,
  newsFeedUtmContentMapping,
} from './news-feed.model';

vi.mock('config', async (importOriginal) => {
  const mod = await importOriginal<{ default: typeof config }>();
  return {
    default: {
      get: vi.fn(mod.default.get.bind(mod.default)),
      has: mod.default.has.bind(mod.default),
    },
  };
});

const mockConfigGet = vi.mocked(config.get);

const NEWS_FEED_ITEM_ID = '4f1c0d52-8b6e-4c43-9f0e-6d2a1b7c3e55';
const BLOGPOST_REQUIRED_VERSION = '7.260901.0';

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
        doesPlatformSupportNewsFeed(PlatformIdentifier.Xtmone, '1.0.0')
      ).toBe(true);
    });
  });

  describe('doesPlatformSupportBlogpostNewsFeed', () => {
    const originalBlogpostSupport =
      RequiredPlatformVersions.NewsFeedBlogpostSupport;

    const replaceRequiredVersion = (requiredVersion: string | null) => {
      RequiredPlatformVersions.NewsFeedBlogpostSupport = {
        [PlatformIdentifier.Opencti]: requiredVersion,
        [PlatformIdentifier.Openaev]: null,
        [PlatformIdentifier.Xtmone]: null,
      };
    };

    afterEach(() => {
      RequiredPlatformVersions.NewsFeedBlogpostSupport =
        originalBlogpostSupport;
    });

    it('is disabled for every platform and version until a required version is set', () => {
      // Given the shipped configuration
      const identifiers = Object.values(PlatformIdentifier);

      // Then
      expect(
        identifiers.map((identifier) => [
          identifier,
          RequiredPlatformVersions.NewsFeedBlogpostSupport[identifier],
        ])
      ).toEqual(identifiers.map((identifier) => [identifier, null]));
      identifiers.forEach((identifier) => {
        expect(doesPlatformSupportBlogpostNewsFeed(identifier, '99.0.0')).toBe(
          false
        );
      });
    });

    it.each`
      description              | requiredVersion              | version                      | expected
      ${'null required'}       | ${null}                      | ${'8.0.0'}                   | ${false}
      ${'below'}               | ${BLOGPOST_REQUIRED_VERSION} | ${'7.260831.0'}              | ${false}
      ${'equal'}               | ${BLOGPOST_REQUIRED_VERSION} | ${BLOGPOST_REQUIRED_VERSION} | ${true}
      ${'above'}               | ${BLOGPOST_REQUIRED_VERSION} | ${'7.260902.0'}              | ${true}
      ${'above (next major)'}  | ${BLOGPOST_REQUIRED_VERSION} | ${'8.0.0'}                   | ${true}
      ${'invalid'}             | ${BLOGPOST_REQUIRED_VERSION} | ${'not-a-version'}           | ${false}
      ${'missing (null)'}      | ${BLOGPOST_REQUIRED_VERSION} | ${null}                      | ${false}
      ${'missing (undefined)'} | ${BLOGPOST_REQUIRED_VERSION} | ${undefined}                 | ${false}
    `(
      'returns $expected for OpenCTI when the version is $description',
      ({ requiredVersion, version, expected }) => {
        replaceRequiredVersion(requiredVersion);

        expect(
          doesPlatformSupportBlogpostNewsFeed(
            PlatformIdentifier.Opencti,
            version
          )
        ).toBe(expected);
      }
    );

    it('returns false for a platform without a required version even when the version is valid', () => {
      replaceRequiredVersion(BLOGPOST_REQUIRED_VERSION);

      expect(
        doesPlatformSupportBlogpostNewsFeed(
          PlatformIdentifier.Openaev,
          '99.0.0'
        )
      ).toBe(false);
    });
  });

  describe('getBlogpostLimit', () => {
    afterEach(() => {
      mockConfigGet.mockReset();
    });

    it('returns the default limit of 6', () => {
      expect(NewsFeedHelper.getBlogpostLimit()).toBe(6);
    });

    it('returns the configured limit', () => {
      mockConfigGet.mockImplementation((key: string) =>
        key === 'news_feed.blogpost_limit' ? 3 : undefined
      );

      expect(NewsFeedHelper.getBlogpostLimit()).toBe(3);
    });

    it.each`
      description         | value
      ${'a string'}       | ${'6'}
      ${'zero'}           | ${0}
      ${'negative'}       | ${-1}
      ${'not an integer'} | ${2.5}
      ${'not finite'}     | ${Infinity}
      ${'missing'}        | ${undefined}
    `('throws when the configured limit is $description', ({ value }) => {
      mockConfigGet.mockImplementation((key: string) =>
        key === 'news_feed.blogpost_limit' ? value : undefined
      );

      expect(() => NewsFeedHelper.getBlogpostLimit()).toThrow(
        /Invalid config "news_feed.blogpost_limit"/
      );
    });
  });

  describe('getNewsFeedConfiguration', () => {
    it.each`
      identifier                                             | expected | description
      ${ServiceDefinitionIdentifier.OpenctiCustomDashboards} | ${true}  | ${'configured service definition'}
      ${ServiceDefinitionIdentifier.OpenctiPlaybooks}        | ${true}  | ${'playbooks service definition'}
      ${ServiceDefinitionIdentifier.OpenctiIntegrations}     | ${true}  | ${'integrations service definition'}
      ${ServiceDefinitionIdentifier.OpenctiRegistration}     | ${false} | ${'registration identifier'}
      ${ServiceDefinitionIdentifier.OpenaevScenarios}        | ${true}  | ${'openaev scenarios service definition'}
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

  describe('addUtmToUrlPath', () => {
    const NEWS_FEED_UTM =
      'utm_source=opencti&utm_medium=newsfeed&utm_campaign=hub_resources';

    it.each`
      type                                        | expectedContent
      ${NewsFeedItemType.ResourceCustomDashboard} | ${'custom_dashboard'}
      ${NewsFeedItemType.ResourceCustomView}      | ${'custom_view'}
      ${NewsFeedItemType.ResourceIntegration}     | ${'integration'}
      ${NewsFeedItemType.ResourcePlaybook}        | ${'playbook'}
      ${NewsFeedItemType.ResourceScenario}        | ${'scenario'}
      ${'UNKNOWN_TYPE'}                           | ${'other'}
    `(
      'should set utm_content=$expectedContent for type $type',
      ({
        type,
        expectedContent,
      }: {
        type: NewsFeedItemType;
        expectedContent: string;
      }) => {
        const result = NewsFeedHelper.addUtmToUrlPath({
          urlPath: 'redirect/opencti_custom_dashboards',
          type,
          platformIdentifier: PlatformIdentifier.Opencti,
        });

        expect(result).toBe(
          `redirect/opencti_custom_dashboards?${NEWS_FEED_UTM}&utm_content=${expectedContent}`
        );
      }
    );

    it.each`
      urlPath                                                       | expected                                                                                               | description
      ${'redirect/opencti_playbooks?document_id=RG9jdW1lbnQ6MQ=='}  | ${`redirect/opencti_playbooks?document_id=RG9jdW1lbnQ6MQ%3D%3D&${NEWS_FEED_UTM}&utm_content=playbook`} | ${'keeps existing query parameters'}
      ${'/redirect/opencti_playbooks?document_id=abc#details'}      | ${`/redirect/opencti_playbooks?document_id=abc&${NEWS_FEED_UTM}&utm_content=playbook#details`}         | ${'keeps the leading slash and the fragment'}
      ${'redirect/opencti_playbooks?utm_source=other&utm_medium=x'} | ${`redirect/opencti_playbooks?${NEWS_FEED_UTM}&utm_content=playbook`}                                  | ${'overwrites existing utm values without duplicating them'}
    `(
      'should tag the url path: $description',
      ({ urlPath, expected }: { urlPath: string; expected: string }) => {
        const result = NewsFeedHelper.addUtmToUrlPath({
          urlPath,
          type: NewsFeedItemType.ResourcePlaybook,
          platformIdentifier: PlatformIdentifier.Opencti,
        });

        expect(result).toBe(expected);
      }
    );

    it.each`
      type                                        | expectedCampaign
      ${NewsFeedItemType.ResourceCustomDashboard} | ${'hub_resources'}
      ${NewsFeedItemType.ResourcePlaybook}        | ${'hub_resources'}
      ${NewsFeedItemType.BlogPost}                | ${'blog_posts'}
      ${'UNKNOWN_TYPE'}                           | ${'hub_resources'}
    `(
      'should set utm_campaign=$expectedCampaign for type $type',
      ({
        type,
        expectedCampaign,
      }: {
        type: NewsFeedItemType;
        expectedCampaign: string;
      }) => {
        const result = NewsFeedHelper.addUtmToUrlPath({
          urlPath: 'redirect/opencti_custom_dashboards',
          type,
          platformIdentifier: PlatformIdentifier.Opencti,
        });

        expect(
          new URLSearchParams(result.split('?')[1]).get('utm_campaign')
        ).toBe(expectedCampaign);
      }
    );

    it('should be idempotent', () => {
      const params = {
        type: NewsFeedItemType.ResourceIntegration,
        platformIdentifier: PlatformIdentifier.Opencti,
      };
      const once = NewsFeedHelper.addUtmToUrlPath({
        urlPath: 'redirect/opencti_integrations?document_id=abc',
        ...params,
      });

      const twice = NewsFeedHelper.addUtmToUrlPath({
        urlPath: once,
        ...params,
      });

      expect(twice).toBe(once);
    });

    it('should use the platform identifier as utm_source', () => {
      const result = NewsFeedHelper.addUtmToUrlPath({
        urlPath: 'redirect/openaev_scenarios',
        type: NewsFeedItemType.ResourceCustomDashboard,
        platformIdentifier: PlatformIdentifier.Openaev,
      });

      expect(new URLSearchParams(result.split('?')[1]).get('utm_source')).toBe(
        'openaev'
      );
    });
  });
  describe('buildRedirectUrlPath', () => {
    it('should return the relative redirect path of the news feed item', () => {
      // When
      const result = NewsFeedHelper.buildRedirectUrlPath(NEWS_FEED_ITEM_ID);

      // Then
      expect(result).toBe(`redirect/news-feed/${NEWS_FEED_ITEM_ID}`);
      expect(result.startsWith('/')).toBe(false);
      expect(result.startsWith(NEWS_FEED_REDIRECT_PATH_PREFIX)).toBe(true);
    });

    it('should encode the item id', () => {
      // When
      const result = NewsFeedHelper.buildRedirectUrlPath('a/b?c#d');

      // Then
      expect(result).toBe('redirect/news-feed/a%2Fb%3Fc%23d');
    });

    it('should work with addUtmToUrlPath', () => {
      // Given
      const urlPath = NewsFeedHelper.buildRedirectUrlPath(NEWS_FEED_ITEM_ID);

      // When
      const result = NewsFeedHelper.addUtmToUrlPath({
        urlPath,
        type: NewsFeedItemType.BlogPost,
        platformIdentifier: PlatformIdentifier.Opencti,
      });

      // Then
      expect(result).toBe(
        `redirect/news-feed/${NEWS_FEED_ITEM_ID}?utm_source=opencti&utm_medium=newsfeed&utm_campaign=blog_posts&utm_content=blog_posts`
      );
    });
  });

  describe('newsFeedUtmContent', () => {
    it('should list every utm_content value that the Hub gives to news feed links', () => {
      // Given
      const givenValues = [
        ...Object.values(newsFeedUtmContentMapping),
        NEWS_FEED_UTM_CONTENT_FALLBACK,
      ];

      // Then
      expect(Object.values(NewsFeedUtmContent).sort()).toEqual(
        [...new Set(givenValues)].sort()
      );
    });
  });
});
