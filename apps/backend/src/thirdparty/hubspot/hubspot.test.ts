import { MockInstance } from '@vitest/spy';
import config from 'config';
import { v4 as uuidv4 } from 'uuid';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  contextAdminSecondOrga,
  requestContextAdminSecondOrga,
  TEST_ORGANIZATIONS,
} from '../../../tests/tests.const';
import {
  DeploymentRequestDeploymentType,
  PlatformIdentifier,
} from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import { UserLoadUserBy } from '../../model/user';
import { logApp } from '../../utils/app-logger.util';
import * as utils from '../../utils/utils';
import { HUBSPOT_TYPE_TO_QUEUE } from '../pgboss/hubspot.jobs';
import { PgBossProducer } from '../pgboss/producer';
import { hubspotHook, hubspotReachOutSalesHook } from './hubspot';

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

  afterEach(async () => {
    await TestHelper.deploymentRequest.delete({});
  });

  describe('reachOutSales (direct sending)', () => {
    beforeEach(() => {
      fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({} as Response);
      logSpy = vi.spyOn(logApp, 'error');
      vi.spyOn(utils, 'isValidUrl').mockReturnValue(true);
      vi.mocked(config.get).mockImplementation((key: string) => {
        if (key === 'hubspot_use_queue_processing') return false;
        return realConfigGet(key);
      });
    });

    it('should log error when request is retrieved from platform id but is not found', async () => {
      const platformId = uuidv4();
      await hubspotReachOutSalesHook({ platformId });

      expect(logSpy).toHaveBeenCalledWith(
        'Failed to send Hubspot reachOutSales hook',
        {
          error: new Error(
            `No deployment request found for platform id: ${platformId}`
          ),
        }
      );
    });

    it('should log an error when deployment request is not a trial request', async () => {
      const platformId = uuidv4();
      const deploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            platform_id: platformId,
            type: 'unknown' as DeploymentRequestDeploymentType,
          }
        );
      await hubspotReachOutSalesHook({ platformId });
      expect(logSpy).toHaveBeenCalledWith(
        'Failed to send Hubspot reachOutSales hook',
        {
          error: new Error(
            `Deployment request ${deploymentRequest.id} is not a trial deployment request`
          ),
        }
      );
    });

    it('should log error when request is retrieved from platform id and user is not authorized', async () => {
      const platformId = uuidv4();
      const deploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            platform_id: platformId,
          }
        );
      requestContext.set(requestContextAdminSecondOrga);

      await hubspotReachOutSalesHook({ platformId });

      expect(logSpy).toHaveBeenCalledWith(
        'Failed to send Hubspot reachOutSales hook',
        {
          error: new Error(
            `Deployment request ${deploymentRequest.id}, organization ${deploymentRequest.organization_requester_id} does not match user ${contextAdminSecondOrga.user.id} organizations`
          ),
        }
      );
    });

    it('should log an error when request is not found with platform token', async () => {
      const platformToken = uuidv4();
      await hubspotReachOutSalesHook({ platformToken });

      expect(logSpy).toHaveBeenCalledWith(
        'Failed to send Hubspot reachOutSales hook',
        {
          error: new Error(
            `No deployment request found for platform token: ${platformToken}`
          ),
        }
      );
    });

    it('should log an error when user is not authenticated and all parameters are missing', async () => {
      requestContext.set({
        user: {} as UserLoadUserBy,
      });
      await hubspotReachOutSalesHook({});

      expect(logSpy).toHaveBeenCalledWith(
        'Failed to send Hubspot reachOutSales hook',
        {
          error: new Error(
            'Either userId, platformToken or platformId must be provided'
          ),
        }
      );
    });

    it('should send message when request is retrieved from platform id and user is authorized', async () => {
      const platformId = uuidv4();
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          platform_id: platformId,
        }
      );

      await hubspotReachOutSalesHook({ platformId });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            type: 'reachOutSales',
            email: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL,
            firstname: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.FIRST_NAME,
            lastname: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.LAST_NAME,
            company: TEST_ORGANIZATIONS.FILIGRAN.NAME,
            message:
              'opencti: Message sent for free trial: pending trial.\n\nPlease contact me about the OpenCTI free trial',
          }),
        })
      );
    });

    it('should send message when request is retrieved from platform token', async () => {
      const deploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {}
        );

      await hubspotReachOutSalesHook({
        platformToken: deploymentRequest.platform_token!,
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            type: 'reachOutSales',
            email: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL,
            firstname: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.FIRST_NAME,
            lastname: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.LAST_NAME,
            company: TEST_ORGANIZATIONS.FILIGRAN.NAME,
            message:
              'opencti: Message sent for free trial: pending trial.\n\nPlease contact me about the OpenCTI free trial',
          }),
        })
      );
    });

    it('should send empty message when request is not found from user id and platform identifier', async () => {
      await hubspotReachOutSalesHook({});
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            type: 'reachOutSales',
            email: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.EMAIL,
            firstname: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.FIRST_NAME,
            lastname: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.LAST_NAME,
            company: TEST_ORGANIZATIONS.FILIGRAN.NAME,
            message: 'opencti: Please contact me about the OpenCTI free trial',
          }),
        })
      );
    });

    it('should send full message when request is found from user id and platform identifier', async () => {
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {}
      );
      await hubspotReachOutSalesHook({});
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            type: 'reachOutSales',
            email: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL,
            firstname: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.FIRST_NAME,
            lastname: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.LAST_NAME,
            company: TEST_ORGANIZATIONS.FILIGRAN.NAME,
            message:
              'opencti: Message sent for free trial: pending trial.\n\nPlease contact me about the OpenCTI free trial',
          }),
        })
      );
    });

    it('should send a bundle message listing the bundled products when a bundle deployment request is found for the user', async () => {
      await TestHelper.deploymentRequest.createBundle({
        children: [
          { platform_identifier: PlatformIdentifier.Opencti },
          { platform_identifier: PlatformIdentifier.Openaev },
        ],
      });

      await hubspotReachOutSalesHook({
        deploymentRequestType: DeploymentRequestDeploymentType.Bundle,
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            type: 'reachOutSales',
            email: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL,
            firstname: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.FIRST_NAME,
            lastname: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.LAST_NAME,
            company: TEST_ORGANIZATIONS.FILIGRAN.NAME,
            message:
              'openaev, opencti: Message sent for free trial: pending bundle.\n\nPlease contact me about the OpenCTI free trial',
          }),
        })
      );
    });

    it('should send generic message when no bundle deployment request is found for the user', async () => {
      await hubspotReachOutSalesHook({
        deploymentRequestType: DeploymentRequestDeploymentType.Bundle,
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            type: 'reachOutSales',
            email: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.EMAIL,
            firstname: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.FIRST_NAME,
            lastname: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.LAST_NAME,
            company: TEST_ORGANIZATIONS.FILIGRAN.NAME,
            message: 'opencti: Please contact me about the OpenCTI free trial',
          }),
        })
      );
    });

    it('should ignore an existing bundle deployment request when deploymentRequestType is omitted', async () => {
      await TestHelper.deploymentRequest.createBundle();

      await hubspotReachOutSalesHook({});

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            type: 'reachOutSales',
            email: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.EMAIL,
            firstname: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.FIRST_NAME,
            lastname: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.LAST_NAME,
            company: TEST_ORGANIZATIONS.FILIGRAN.NAME,
            message: 'opencti: Please contact me about the OpenCTI free trial',
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
