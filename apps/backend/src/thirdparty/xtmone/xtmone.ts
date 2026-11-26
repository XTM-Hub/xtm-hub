import { XtmoneIntegrationStatus } from '../../__generated__/resolvers-types';
import { logApp } from '../../utils/app-logger.util';

const XTMONE_STATUS_TIMEOUT_MS = 8000;

interface XtmonePlatformConfigResponse {
  integration_status?: XtmoneIntegrationStatus;
}

export const fetchXtmoneIntegrationStatus = async (
  baseUrl: string
): Promise<XtmoneIntegrationStatus | null> => {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    return null;
  }
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    return null;
  }

  const url = new URL('/api/v1/platform/config', parsedUrl).href;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    XTMONE_STATUS_TIMEOUT_MS
  );

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      credentials: 'omit',
      redirect: 'error',
    });
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as XtmonePlatformConfigResponse;
    const integrationStatus = body?.integration_status;
    if (!integrationStatus?.opencti || !integrationStatus?.openaev) {
      return null;
    }
    return integrationStatus;
  } catch (error) {
    logApp.warn('Failed to fetch XTM One integration status', {
      xtmoneOrigin: parsedUrl.origin,
      error,
    });
    return null;
  } finally {
    clearTimeout(timeout);
  }
};
