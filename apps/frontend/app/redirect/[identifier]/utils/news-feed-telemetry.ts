import { createPortalGraphqlClient } from '@/lib/graphql-client';
import { buildCookieHeader } from '@/lib/graphql-fetch.utils';
import { isValueInEnum } from '@/utils/is-value-in-enum';
import {
  NewsFeedRedirectInput,
  NewsFeedUtmContent,
  NewsFeedUtmMedium,
  PlatformIdentifier,
  SendNewsFeedRedirectTelemetryDocument,
  SendNewsFeedRedirectTelemetryMutation,
  SendNewsFeedRedirectTelemetryMutationVariables,
  ServiceDefinitionIdentifier,
} from '@graphql/generated';
import { NextRequest } from 'next/server';

// The query string is client-controlled and an enum violation fails the whole
// mutation, so a value that is not a member of its enum is left out.
const toEnumValueOrNull = <T extends Record<string, string>>(
  value: string | null,
  enumObject: T
): T[keyof T] | null => (isValueInEnum(value, enumObject) ? value : null);

export const buildNewsFeedRedirectInput = (
  identifier: ServiceDefinitionIdentifier,
  searchParams: URLSearchParams
): NewsFeedRedirectInput | undefined => {
  // The utm_medium that the backend adds to every news feed link
  if (searchParams.get('utm_medium') !== NewsFeedUtmMedium.Newsfeed) {
    return undefined;
  }

  return {
    service_identifier: identifier,
    resource_id: searchParams.get('document_id') || null,
    platform_id: searchParams.get('platform_id') || null,
    platform_identifier: toEnumValueOrNull(
      searchParams.get('utm_source'),
      PlatformIdentifier
    ),
    utm_content: toEnumValueOrNull(
      searchParams.get('utm_content'),
      NewsFeedUtmContent
    ),
  };
};

// Fire and forget, best-effort analytics: the request is started but never
// awaited, and any failure (synchronous or not) is swallowed, so the telemetry
// can change neither the redirect response nor its latency.
export const trackNewsFeedRedirect = (
  identifier: ServiceDefinitionIdentifier,
  request: NextRequest
) => {
  try {
    const input = buildNewsFeedRedirectInput(
      identifier,
      request.nextUrl.searchParams
    );
    if (!input) {
      return;
    }

    // The cookies are read now, from the request, so nothing depends on the
    // request scope once the redirect has been returned.
    const client = createPortalGraphqlClient(
      buildCookieHeader(request.cookies.getAll())
    );
    client
      .request<
        SendNewsFeedRedirectTelemetryMutation,
        SendNewsFeedRedirectTelemetryMutationVariables
      >(SendNewsFeedRedirectTelemetryDocument, { input })
      .catch(() => undefined);
  } catch {
    // Best-effort analytics: never break the redirect
  }
};
