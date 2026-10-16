import {
  NewsFeedUtmContent,
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
} from '@graphql/generated';
import { describe, expect, it } from 'vitest';
import { buildNewsFeedRedirectInput } from './news-feed-telemetry';

const IDENTIFIER = ServiceDefinitionIdentifier.OpenctiCustomDashboards;
const DOCUMENT_ID = 'document-1';
const PLATFORM_ID = 'platform-1';

const toSearchParams = (query: string) => new URLSearchParams(query);

describe('buildNewsFeedRedirectInput', () => {
  it('should build the full input when the link comes from the news feed', () => {
    // Given
    const searchParams = toSearchParams(
      `utm_medium=newsfeed&utm_source=opencti&utm_content=custom_dashboard&document_id=${DOCUMENT_ID}&platform_id=${PLATFORM_ID}`
    );

    // When
    const input = buildNewsFeedRedirectInput(IDENTIFIER, searchParams);

    // Then
    expect(input).toEqual({
      service_identifier: IDENTIFIER,
      resource_id: DOCUMENT_ID,
      platform_id: PLATFORM_ID,
      platform_identifier: PlatformIdentifier.Opencti,
      utm_content: NewsFeedUtmContent.CustomDashboard,
    });
  });

  it.each([
    ['utm_medium is missing', 'document_id=document-1&utm_source=opencti'],
    ['utm_medium is another medium', 'utm_medium=referral&utm_source=opencti'],
    ['utm_medium has another case', 'utm_medium=NewsFeed'],
    ['utm_medium is empty', 'utm_medium='],
  ])('should build no input when %s', (_description: string, query: string) => {
    // Given
    const searchParams = toSearchParams(query);

    // When
    const input = buildNewsFeedRedirectInput(IDENTIFIER, searchParams);

    // Then
    expect(input).toBeUndefined();
  });

  it.each([
    ['openaev', PlatformIdentifier.Openaev],
    ['xtmone', PlatformIdentifier.Xtmone],
    ['opencti', PlatformIdentifier.Opencti],
  ])(
    'should map utm_source %s to the platform identifier',
    (utmSource: string, expected: PlatformIdentifier) => {
      // Given
      const searchParams = toSearchParams(
        `utm_medium=newsfeed&utm_source=${utmSource}`
      );

      // When
      const input = buildNewsFeedRedirectInput(IDENTIFIER, searchParams);

      // Then
      expect(input?.platform_identifier).toBe(expected);
    }
  );

  it.each([
    ['an unknown value', 'utm_source=unknown'],
    ['a value with another case', 'utm_source=OpenCTI'],
    ['an empty value', 'utm_source='],
    ['no value', 'utm_campaign=hub_resources'],
  ])(
    'should omit the platform identifier when utm_source has %s',
    (_description: string, query: string) => {
      // Given
      const searchParams = toSearchParams(`utm_medium=newsfeed&${query}`);

      // When
      const input = buildNewsFeedRedirectInput(IDENTIFIER, searchParams);

      // Then
      expect(input).toMatchObject({ platform_identifier: null });
    }
  );

  it.each([
    ['custom_dashboard', NewsFeedUtmContent.CustomDashboard],
    ['custom_view', NewsFeedUtmContent.CustomView],
    ['integration', NewsFeedUtmContent.Integration],
    ['playbook', NewsFeedUtmContent.Playbook],
    ['other', NewsFeedUtmContent.Other],
  ])(
    'should keep utm_content %s',
    (utmContent: string, expected: NewsFeedUtmContent) => {
      // Given
      const searchParams = toSearchParams(
        `utm_medium=newsfeed&utm_content=${utmContent}`
      );

      // When
      const input = buildNewsFeedRedirectInput(IDENTIFIER, searchParams);

      // Then
      expect(input?.utm_content).toBe(expected);
    }
  );

  it.each([
    ['an unknown value', 'utm_content=blog_post'],
    ['a value with another case', 'utm_content=Playbook'],
    ['an empty value', 'utm_content='],
    ['no value', 'utm_campaign=hub_resources'],
  ])(
    'should omit utm_content when it has %s',
    (_description: string, query: string) => {
      // Given
      const searchParams = toSearchParams(`utm_medium=newsfeed&${query}`);

      // When
      const input = buildNewsFeedRedirectInput(IDENTIFIER, searchParams);

      // Then
      expect(input).toMatchObject({ utm_content: null });
    }
  );

  it('should omit the resource and the platform when the link carries none', () => {
    // Given
    const searchParams = toSearchParams('utm_medium=newsfeed');

    // When
    const input = buildNewsFeedRedirectInput(IDENTIFIER, searchParams);

    // Then
    expect(input).toEqual({
      service_identifier: IDENTIFIER,
      resource_id: null,
      platform_id: null,
      platform_identifier: null,
      utm_content: null,
    });
  });
});
