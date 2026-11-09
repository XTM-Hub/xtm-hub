import config from 'config';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import portalConfig from '../../config';
import { logApp } from '../../utils/app-logger.util';
import type { TeamsNotificationPayloadMap } from '../pgboss/teams-notification.jobs';
import { teamsNotificationSend } from './teams-notification';

vi.mock('config', async (importOriginal) => {
  const mod = await importOriginal<{ default: typeof config }>();
  return {
    default: {
      get: vi.fn(mod.default.get.bind(mod.default)),
      has: mod.default.has.bind(mod.default),
    },
  };
});

const WEBHOOK_URL = 'https://n8n.example.com/webhook/teams-notification';

const PAYLOAD: TeamsNotificationPayloadMap['resource_in_validation'] = {
  library: 'OpenCTI Integrations Library',
  resource: {
    name: 'My CSV feed',
    type: 'CSV Feed',
    status: 'in_validation',
    short_description: 'A short description.',
    link: 'https://hub.example.com/redirect/opencti-integrations?document_id=abc',
    author_email: 'author@filigran.io',
  },
};

describe('teamsNotificationSend', () => {
  let realConfigGet: typeof config.get;

  const mockWebhookUrl = (url: string, token = '') =>
    vi.mocked(config.get).mockImplementation((key: string) => {
      if (key === 'teams_notification_webhook_url') return url;
      if (key === 'teams_notification_webhook_token') return token;
      return realConfigGet(key);
    });

  beforeAll(() => {
    realConfigGet = vi
      .mocked(config.get)
      .getMockImplementation() as typeof config.get;
  });

  beforeEach(() => {
    vi.spyOn(logApp, 'debug').mockReturnValue(logApp);
    vi.spyOn(logApp, 'info').mockReturnValue(logApp);
    vi.spyOn(logApp, 'warn').mockReturnValue(logApp);
  });

  afterEach(() => {
    vi.mocked(config.get).mockImplementation(realConfigGet);
    vi.restoreAllMocks();
  });

  it.each([
    ['empty', ''],
    ['invalid', 'not-a-url'],
  ])('should not call the webhook when the url is %s', async (_label, url) => {
    // Given
    mockWebhookUrl(url);
    const fetchSpy = vi.spyOn(global, 'fetch');

    // When
    await teamsNotificationSend('resource_in_validation', PAYLOAD);

    // Then
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should warn only when the url is set but invalid', async () => {
    // Given
    const warnSpy = vi.spyOn(logApp, 'warn').mockReturnValue(logApp);

    // When
    mockWebhookUrl('');
    await teamsNotificationSend('resource_in_validation', PAYLOAD);
    const warningsForEmptyUrl = warnSpy.mock.calls.length;
    mockWebhookUrl('not-a-url');
    await teamsNotificationSend('resource_in_validation', PAYLOAD);

    // Then
    expect(warningsForEmptyUrl).toBe(0);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('should rethrow when the webhook cannot be reached', async () => {
    // Given
    mockWebhookUrl(WEBHOOK_URL);
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));

    // When
    const send = teamsNotificationSend('resource_in_validation', PAYLOAD);

    // Then
    await expect(send).rejects.toThrow('network down');
  });

  it('should send the token as a bearer authorization header when one is configured', async () => {
    // Given
    mockWebhookUrl(WEBHOOK_URL, 'secret-token');
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true } as Response);

    // When
    await teamsNotificationSend('resource_in_validation', PAYLOAD);

    // Then
    expect(fetchSpy.mock.calls[0][1]?.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer secret-token',
    });
  });

  it('should post the event, the environment and the payload as json without any auth header when no token is configured', async () => {
    // Given
    mockWebhookUrl(WEBHOOK_URL);
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true } as Response);

    // When
    await teamsNotificationSend('resource_in_validation', PAYLOAD);

    // Then
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(WEBHOOK_URL);
    expect(init).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(JSON.parse(init?.body as string)).toEqual({
      event: 'resource_in_validation',
      environment: portalConfig.environment,
      ...PAYLOAD,
    });
  });

  it('should cancel the unused response body once the webhook answers', async () => {
    // Given
    mockWebhookUrl(WEBHOOK_URL);
    const cancel = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      body: { cancel },
    } as unknown as Response);

    // When
    await teamsNotificationSend('resource_in_validation', PAYLOAD);

    // Then
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('should throw with the http status when the webhook answers a non-2xx status', async () => {
    // Given
    mockWebhookUrl(WEBHOOK_URL);
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('boom'),
    } as Response);

    // When
    const send = teamsNotificationSend('resource_in_validation', PAYLOAD);

    // Then
    await expect(send).rejects.toThrow(
      'Teams notification webhook returned HTTP 500: boom'
    );
  });
});
