import config from 'config';
import {
  createSaasManagerTokenProvider,
  type SaasManagerTokenProvider,
} from './token-provider';

const SAAS_MANAGER_TIMEOUT_MS = 10_000;
const SAAS_MANAGER_INSTANCE_PATH = '/api/instance/';

interface SaasManagerRequest {
  method?: 'GET' | 'HEAD';
  platform_id?: string;
}

// Configuration is immutable at runtime, so one provider (and one token cache) serves the whole process.
let tokenProvider: SaasManagerTokenProvider | null = null;

const getTokenProvider = (
  baseUrl: string,
  clientId: string
): SaasManagerTokenProvider => {
  tokenProvider ??= createSaasManagerTokenProvider({
    baseUrl,
    clientId,
    clientSecret: config.get<string | null>('saas_manager.client_secret'),
  });
  return tokenProvider;
};

const sendRequest = (
  url: URL,
  method: SaasManagerRequest['method'],
  authorization: string
): Promise<Response> =>
  fetch(url, {
    method,
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
    },
    redirect: 'error',
    signal: AbortSignal.timeout(SAAS_MANAGER_TIMEOUT_MS),
  });

export const SaasManagerClient = {
  async callInstanceApi({
    method = 'GET',
    platform_id,
  }: SaasManagerRequest = {}): Promise<Response> {
    const baseUrl = config.get<string | null>('saas_manager.url');
    if (!baseUrl) {
      throw new Error('SaaS Manager URL is not configured');
    }

    const path = platform_id
      ? `${SAAS_MANAGER_INSTANCE_PATH}${encodeURIComponent(platform_id)}/`
      : SAAS_MANAGER_INSTANCE_PATH;
    const url = new URL(path, baseUrl);

    const clientId = config.get<string | null>('saas_manager.client_id');
    if (!clientId) {
      throw new Error('SaaS Manager client ID is not configured');
    }

    const provider = getTokenProvider(baseUrl, clientId);
    const accessToken = await provider.getAccessToken();
    const response = await sendRequest(url, method, `Bearer ${accessToken}`);
    if (response.status !== 401) {
      return response;
    }

    // The token may have been revoked before its expiry: renew it and retry once, never more.
    await response.body?.cancel();
    provider.invalidate(accessToken);
    return sendRequest(
      url,
      method,
      `Bearer ${await provider.getAccessToken()}`
    );
  },
};
