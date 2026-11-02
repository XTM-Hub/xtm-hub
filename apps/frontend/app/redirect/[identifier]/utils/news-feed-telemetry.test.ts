import {
  NewsFeedUtmContent,
  PlatformIdentifier,
  SendNewsFeedRedirectTelemetryDocument,
  ServiceDefinitionIdentifier,
} from '@graphql/generated';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildNewsFeedRedirectInput,
  trackNewsFeedRedirect,
} from './news-feed-telemetry';

const telemetryMocks = vi.hoisted(() => ({
  request: vi.fn(),
  createPortalGraphqlClient: vi.fn(),
}));

vi.mock('@/lib/graphql-client', () => ({
  createPortalGraphqlClient: telemetryMocks.createPortalGraphqlClient,
}));

const IDENTIFIER = ServiceDefinitionIdentifier.OpenctiCustomDashboards;
const DOCUMENT_ID = 'document-1';
const PLATFORM_ID = 'platform-1';
const NEWS_FEED_QUERY = `utm_medium=newsfeed&utm_source=opencti&utm_content=custom_dashboard&document_id=${DOCUMENT_ID}&platform_id=${PLATFORM_ID}`;
const FULL_INPUT = {
  service_identifier: IDENTIFIER,
  resource_id: DOCUMENT_ID,
  platform_id: PLATFORM_ID,
  platform_identifier: PlatformIdentifier.Opencti,
  utm_content: NewsFeedUtmContent.CustomDashboard,
};

describe('buildNewsFeedRedirectInput', () => {
  it('should build the full input when the link comes from the news feed', () => {
    // When
    const input = buildNewsFeedRedirectInput(
      IDENTIFIER,
      new URLSearchParams(NEWS_FEED_QUERY)
    );

    // Then
    expect(input).toEqual(FULL_INPUT);
  });

  it('should omit the resource, the platform and the utm values that the link does not carry', () => {
    // When
    const input = buildNewsFeedRedirectInput(
      IDENTIFIER,
      new URLSearchParams('utm_medium=newsfeed')
    );

    // Then
    expect(input).toEqual({
      service_identifier: IDENTIFIER,
      resource_id: null,
      platform_id: null,
      platform_identifier: null,
      utm_content: null,
    });
  });

  it.each([
    ['utm_medium is missing', 'document_id=document-1&utm_source=opencti'],
    ['utm_medium is another medium', 'utm_medium=referral'],
    ['utm_medium has another case', 'utm_medium=NewsFeed'],
    ['utm_medium is empty', 'utm_medium='],
  ])('should build no input when %s', (_description: string, query: string) => {
    expect(
      buildNewsFeedRedirectInput(IDENTIFIER, new URLSearchParams(query))
    ).toBeUndefined();
  });

  it.each([
    ['openaev', PlatformIdentifier.Openaev],
    ['xtmone', PlatformIdentifier.Xtmone],
    ['opencti', PlatformIdentifier.Opencti],
    ['OpenCTI', null],
    ['unknown', null],
    ['', null],
  ])(
    'should map utm_source "%s" to the platform identifier %s',
    (utmSource: string, expected: PlatformIdentifier | null) => {
      // When
      const input = buildNewsFeedRedirectInput(
        IDENTIFIER,
        new URLSearchParams({ utm_medium: 'newsfeed', utm_source: utmSource })
      );

      // Then
      expect(input?.platform_identifier).toBe(expected);
    }
  );

  it.each([
    ['custom_dashboard', NewsFeedUtmContent.CustomDashboard],
    ['custom_view', NewsFeedUtmContent.CustomView],
    ['integration', NewsFeedUtmContent.Integration],
    ['playbook', NewsFeedUtmContent.Playbook],
    ['other', NewsFeedUtmContent.Other],
    ['Playbook', null],
    ['blog_post', null],
    ['', null],
  ])(
    'should map utm_content "%s" to %s',
    (utmContent: string, expected: NewsFeedUtmContent | null) => {
      // When
      const input = buildNewsFeedRedirectInput(
        IDENTIFIER,
        new URLSearchParams({ utm_medium: 'newsfeed', utm_content: utmContent })
      );

      // Then
      expect(input?.utm_content).toBe(expected);
    }
  );
});

describe('trackNewsFeedRedirect', () => {
  const SESSION_COOKIE = 'session=session-1';

  const makeRequest = (query = NEWS_FEED_QUERY) =>
    new NextRequest(`http://localhost:3002/redirect/${IDENTIFIER}?${query}`, {
      headers: { cookie: SESSION_COOKIE },
    });

  beforeEach(() => {
    vi.clearAllMocks();
    telemetryMocks.request.mockResolvedValue({
      sendTelemetryEvent: { newsFeedRedirect: { result: true } },
    });
    telemetryMocks.createPortalGraphqlClient.mockReturnValue({
      request: telemetryMocks.request,
    });
  });

  it('should send one event with the input of the link, with the session of the user', () => {
    // When
    trackNewsFeedRedirect(IDENTIFIER, makeRequest());

    // Then
    expect(telemetryMocks.createPortalGraphqlClient).toHaveBeenCalledWith(
      SESSION_COOKIE
    );
    expect(telemetryMocks.request).toHaveBeenCalledOnce();
    expect(telemetryMocks.request).toHaveBeenCalledWith(
      SendNewsFeedRedirectTelemetryDocument,
      { input: FULL_INPUT }
    );
  });

  it('should send nothing when the link does not come from the news feed', () => {
    // When
    trackNewsFeedRedirect(IDENTIFIER, makeRequest('utm_medium=referral'));

    // Then
    expect(telemetryMocks.createPortalGraphqlClient).not.toHaveBeenCalled();
    expect(telemetryMocks.request).not.toHaveBeenCalled();
  });

  describe('when the telemetry fails', () => {
    it.each([
      [
        'the request rejects',
        () => telemetryMocks.request.mockRejectedValue(new Error('boom')),
      ],
      [
        'the request throws',
        () =>
          telemetryMocks.request.mockImplementation(() => {
            throw new Error('boom');
          }),
      ],
      [
        'the client cannot be created',
        () =>
          telemetryMocks.createPortalGraphqlClient.mockImplementation(() => {
            throw new Error('boom');
          }),
      ],
      [
        'the request never resolves',
        () =>
          telemetryMocks.request.mockReturnValue(new Promise(() => undefined)),
      ],
    ])(
      'should return without error when %s',
      (_description: string, makeTelemetryFail: () => void) => {
        // Given
        makeTelemetryFail();

        // When
        const track = () => trackNewsFeedRedirect(IDENTIFIER, makeRequest());

        // Then
        expect(track).not.toThrow();
      }
    );
  });
});
