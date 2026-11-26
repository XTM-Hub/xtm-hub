import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestContext, RequestContext } from '../context/request.context';
import { UserLoadUserBy } from '../model/user';
import { appLogger, logApp } from './app-logger.util';

describe('logApp', () => {
  beforeEach(() => {
    // Restore the real AsyncLocalStorage-backed requestContext, since the
    // global test setup replaces it with an in-memory double that falls back
    // to a fixture user when nothing was explicitly set/run.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originals = (globalThis as any).__originalRequestContext;
    if (originals) {
      Object.assign(requestContext, originals);
    }
    requestContext.set(undefined);

    vi.spyOn(appLogger, 'log').mockImplementation(() => appLogger);
  });

  it('logs user_id/correlation_id and the new fields as undefined when no request context is set', () => {
    logApp.info('no context message');

    expect(appLogger.log).toHaveBeenCalledWith(
      'info',
      'no context message',
      expect.objectContaining({
        user_id: undefined,
        correlation_id: undefined,
        user_agent: undefined,
        ip: undefined,
        referer: undefined,
        organization_id: undefined,
      })
    );
  });

  it('enriches logs with request metadata from the request context', () => {
    const testContext: RequestContext = {
      user: { id: 42 } as unknown as UserLoadUserBy,
      correlationId: 'correlation-1',
      userAgent: 'Mozilla/5.0 (test)',
      ip: '203.0.113.10',
      referer: 'https://example.com/page',
      organizationId: 'org-1' as RequestContext['organizationId'],
    };
    requestContext.set(testContext);

    logApp.info('with context message');

    expect(appLogger.log).toHaveBeenCalledWith(
      'info',
      'with context message',
      expect.objectContaining({
        user_id: 42,
        correlation_id: 'correlation-1',
        user_agent: 'Mozilla/5.0 (test)',
        ip: '203.0.113.10',
        referer: 'https://example.com/page',
        organization_id: 'org-1',
      })
    );
  });

  it('prefers the organization id from an explicitly passed user over the request context', () => {
    requestContext.set({
      organizationId: 'org-from-context',
    } as RequestContext);

    logApp.info('explicit user message', {
      user: {
        id: 7,
        selected_organization_id: 'org-from-user',
      } as unknown as UserLoadUserBy,
    });

    expect(appLogger.log).toHaveBeenCalledWith(
      'info',
      'explicit user message',
      expect.objectContaining({
        user_id: 7,
        organization_id: 'org-from-user',
      })
    );
  });

  it('does not populate request-scoped metadata fields from arbitrary meta keys', () => {
    logApp.info('sensitive message', {
      cookie: 'session=super-secret',
      password: 'hunter2',
    });

    const [, , meta] = vi.mocked(appLogger.log).mock.calls[0] as unknown as [
      string,
      string,
      Record<string, unknown>,
    ];

    // The dedicated user_agent/ip/referer/organization_id keys are only ever
    // populated from RequestContext, never from arbitrary meta keys
    // passing unrelated sensitive-looking keys should not surface under them.
    expect(meta.user_agent).toBeUndefined();
    expect(meta.ip).toBeUndefined();
    expect(meta.referer).toBeUndefined();
    expect(meta.organization_id).toBeUndefined();
  });
});
