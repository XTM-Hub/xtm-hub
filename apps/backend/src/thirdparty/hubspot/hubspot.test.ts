import { MockInstance } from '@vitest/spy';
import config from 'config';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  contextAdminSecondOrga,
  requestContextAdminSecondOrga,
} from '../../../tests/tests.const';
import { requestContext } from '../../context/request.context';
import { logApp } from '../../utils/app-logger.util';
import * as utils from '../../utils/utils';
import { HUBSPOT_TYPE_TO_QUEUE } from '../pgboss/hubspot.jobs';
import { PgBossProducer } from '../pgboss/producer';
import { hubspotHook, hubspotInviteUserHook } from './hubspot';

vi.mock('config', async (importOriginal) => {
  const mod = await importOriginal<{ default: typeof config }>();
  return {
    default: {
      get: vi.fn(mod.default.get.bind(mod.default)),
      has: mod.default.has.bind(mod.default),
    },
  };
});

describe('hubspot', () => {
  let realConfigGet: typeof config.get;

  beforeAll(() => {
    realConfigGet = vi
      .mocked(config.get)
      .getMockImplementation() as typeof config.get;
  });
  let fetchSpy: MockInstance;
  let logSpy: MockInstance;

  describe('inviteUser (direct sending)', () => {
    beforeEach(() => {
      fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({} as Response);
      vi.spyOn(utils, 'isValidUrl').mockReturnValue(true);
      vi.mocked(config.get).mockImplementation((key: string) => {
        if (key === 'hubspot_use_queue_processing') return false;
        return realConfigGet(key);
      });
    });

    it('should send the invited user email and name, and the inviter email', async () => {
      requestContext.set(requestContextAdminSecondOrga);

      await hubspotInviteUserHook({
        email: 'invited@filigran.io',
        first_name: 'Jane',
        last_name: 'Doe',
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            type: 'inviteUser',
            email: 'invited@filigran.io',
            first_name: 'Jane',
            last_name: 'Doe',
            inviter_email: contextAdminSecondOrga.user.email,
          }),
        })
      );
    });
  });

  describe('hubspotHook (queue processing)', () => {
    let pgBossSendSpy: MockInstance;

    beforeEach(() => {
      logSpy = vi.spyOn(logApp, 'error');
      pgBossSendSpy = vi
        .spyOn(PgBossProducer, 'send')
        .mockResolvedValue('job-id');
      vi.mocked(config.get).mockImplementation((key: string) => {
        if (key === 'hubspot_use_queue_processing') return true;
        return realConfigGet(key);
      });
    });

    it('should enqueue job via PgBossProducer when queue processing is enabled', async () => {
      const payload = {
        email: 'test@example.com' as string | null,
        first_login: true,
        last_login: null as Date | null,
        is_admin: false,
      };
      await hubspotHook('login', async () => payload);

      expect(pgBossSendSpy).toHaveBeenCalledWith(HUBSPOT_TYPE_TO_QUEUE.login, {
        type: 'login',
        payload,
      });
    });

    it('should log an error when buildPayload throws', async () => {
      const buildError = new Error('payload build failed');
      await hubspotHook('login', async () => {
        throw buildError;
      });

      expect(logSpy).toHaveBeenCalledWith('Failed to send Hubspot login hook', {
        error: buildError,
      });
      expect(pgBossSendSpy).not.toHaveBeenCalled();
    });

    it('should log enqueue error when PgBossProducer.send fails', async () => {
      const sendError = new Error('PgBoss connection lost');
      pgBossSendSpy.mockRejectedValue(sendError);

      await hubspotHook('login', async () => ({
        email: 'test@example.com',
        first_login: false,
        last_login: new Date('2026-01-01'),
        is_admin: true,
      }));

      expect(logSpy).toHaveBeenCalledWith(
        'Failed to enqueue Hubspot login job',
        { error: sendError }
      );
    });
  });
});
