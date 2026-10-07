import config from 'config';

const SAAS_MANAGER_TIMEOUT_MS = 10_000;
const SAAS_MANAGER_INSTANCE_PATH = '/api/instance/';

interface SaasManagerRequest {
  method?: 'GET' | 'HEAD';
  platform_id?: string;
}

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

    return fetch(new URL(path, baseUrl), {
      method,
      headers: {
        Authorization: `TOKEN ${config.get<string>('saas_manager.token')}`,
        'Content-Type': 'application/json',
      },
      redirect: 'error',
      signal: AbortSignal.timeout(SAAS_MANAGER_TIMEOUT_MS),
    });
  },
};
