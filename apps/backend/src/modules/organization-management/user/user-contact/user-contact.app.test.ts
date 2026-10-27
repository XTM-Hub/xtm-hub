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
import { TestHelper } from '../../../../../tests/helper/test.helper';
import {
  requestContextAdminSecondOrga,
  requestContextRegistererUserSecondOrga,
  TEST_ORGANIZATIONS,
} from '../../../../../tests/tests.const';
import {
  DeploymentRequestDeploymentType,
  PlatformContract,
  PlatformIdentifier,
} from '../../../../__generated__/resolvers-types';
import { requestContext } from '../../../../context/request.context';
import { ErrorCode } from '../../../../utils/error/error.code';
import * as utils from '../../../../utils/utils';
import { RegistrationApp } from '../../../registration/registration.app';
import { UserContactApp } from './user-contact.app';

vi.mock('config', async (importOriginal) => {
  const mod = await importOriginal<{ default: typeof config }>();
  return {
    default: {
      get: vi.fn(mod.default.get.bind(mod.default)),
      has: mod.default.has.bind(mod.default),
    },
  };
});

describe('user contact app', () => {
  let realConfigGet: typeof config.get;

  beforeAll(() => {
    realConfigGet = vi
      .mocked(config.get)
      .getMockImplementation() as typeof config.get;
  });
  let fetchSpy: MockInstance;

  afterEach(async () => {
    await TestHelper.deploymentRequest.delete({});
  });

  describe('contactSales', () => {
    beforeEach(() => {
      fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({} as Response);
      vi.spyOn(utils, 'isValidUrl').mockReturnValue(true);
      vi.mocked(config.get).mockImplementation((key: string) => {
        if (key === 'hubspot_use_queue_processing') return false;
        return realConfigGet(key);
      });
    });

    it('should refuse a platform id that matches no deployment request', async () => {
      // When
      const call = UserContactApp.contactSales({ platformId: uuidv4() });

      // Then
      await expect(call).rejects.toThrow(ErrorCode.DeploymentRequestNotFound);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should refuse a platform id whose deployment request is not a trial', async () => {
      // Given
      const platformId = uuidv4();
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          platform_id: platformId,
          type: 'unknown' as DeploymentRequestDeploymentType,
        }
      );

      // When
      const call = UserContactApp.contactSales({ platformId });

      // Then
      await expect(call).rejects.toThrow(ErrorCode.DeploymentRequestNotFound);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should refuse a platform id whose trial belongs to another organization', async () => {
      // Given
      const platformId = uuidv4();
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        { platform_id: platformId }
      );
      requestContext.set(requestContextAdminSecondOrga);

      // When
      const call = UserContactApp.contactSales({ platformId });

      // Then
      await expect(call).rejects.toThrow(ErrorCode.DeploymentRequestNotFound);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should refuse a platform token that matches no trial', async () => {
      // When
      const call = UserContactApp.contactSales({ platformToken: uuidv4() });

      // Then
      await expect(call).rejects.toThrow(ErrorCode.InvalidPlatformToken);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should refuse a platform token whose trial belongs to another organization', async () => {
      // Given
      const deploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {}
        );
      requestContext.set(requestContextAdminSecondOrga);

      // When
      const call = UserContactApp.contactSales({
        platformToken: deploymentRequest.platform_token!,
      });

      // Then
      await expect(call).rejects.toThrow(ErrorCode.InvalidPlatformToken);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should send message when request is retrieved from platform id and user is authorized', async () => {
      const platformId = uuidv4();
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          platform_id: platformId,
        }
      );

      await UserContactApp.contactSales({ platformId });

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

      await UserContactApp.contactSales({
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
      await UserContactApp.contactSales({});
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

    it('should send the sender as contact even when another member of their organization requested a trial of the product', async () => {
      // Given
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {}
      );

      // When
      await UserContactApp.contactSales({});

      // Then
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

    it('should send the sender as contact with the bundled products in the message when another member of their organization requested the bundle', async () => {
      // Given
      await TestHelper.deploymentRequest.createBundle({
        children: [
          { platform_identifier: PlatformIdentifier.Opencti },
          { platform_identifier: PlatformIdentifier.Openaev },
        ],
      });

      // When
      await UserContactApp.contactSales({
        deploymentRequestType: DeploymentRequestDeploymentType.Bundle,
      });

      // Then
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            type: 'reachOutSales',
            email: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.EMAIL,
            firstname: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.FIRST_NAME,
            lastname: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.LAST_NAME,
            company: TEST_ORGANIZATIONS.FILIGRAN.NAME,
            message:
              'openaev, opencti: Message sent for free trial: pending bundle.\n\nPlease contact me about the OpenCTI free trial',
          }),
        })
      );
    });

    it('should send generic message when no bundle deployment request is found for the user', async () => {
      await UserContactApp.contactSales({
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

      await UserContactApp.contactSales({});

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

  describe('contactSalesFromPlatform', () => {
    const expectSentContact = (contact: Record<string, string>) =>
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ type: 'reachOutSales', ...contact }),
        })
      );

    beforeEach(() => {
      fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({} as Response);
      vi.spyOn(utils, 'isValidUrl').mockReturnValue(true);
      vi.mocked(config.get).mockImplementation((key: string) => {
        if (key === 'hubspot_use_queue_processing') return false;
        return realConfigGet(key);
      });
    });

    it('should send the trial requester as contact for a trial deployment token', async () => {
      // Given
      const platformId = uuidv4();
      const deploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          { platform_id: platformId }
        );

      // When
      await UserContactApp.contactSalesFromPlatform({
        message: 'Please call me',
        platformId,
        platformToken: deploymentRequest.platform_token!,
      });

      // Then
      expectSentContact({
        email: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL,
        firstname: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.FIRST_NAME,
        lastname: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.LAST_NAME,
        company: TEST_ORGANIZATIONS.FILIGRAN.NAME,
        message:
          'opencti: Message sent for free trial: pending trial.\n\nPlease call me',
      });
    });

    it('should send the registerer as contact for a registration token', async () => {
      // Given
      const platformId = uuidv4();
      requestContext.set(requestContextRegistererUserSecondOrga);
      const token = await RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform: {
          id: platformId,
          title: 'My OpenCTI platform',
          url: 'http://example.com',
          contract: PlatformContract.Ee,
          version: '6.8.0',
        },
        identifier: PlatformIdentifier.Opencti,
      });
      fetchSpy.mockClear();

      // When
      await UserContactApp.contactSalesFromPlatform({
        message: 'Please call me',
        platformId,
        platformToken: token,
      });

      // Then
      expectSentContact({
        email: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.EMAIL,
        firstname:
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.FIRST_NAME,
        lastname:
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.LAST_NAME,
        company: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.NAME,
        message: 'opencti: Please call me',
      });
    });

    it('should refuse an unknown platform token without sending anything', async () => {
      // When
      const call = UserContactApp.contactSalesFromPlatform({
        platformId: uuidv4(),
        platformToken: uuidv4(),
      });

      // Then
      await expect(call).rejects.toThrow(ErrorCode.InvalidPlatformToken);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it.each`
      description                      | platformId    | platformToken
      ${'a platform id not a UUID'}    | ${'not-a-id'} | ${uuidv4()}
      ${'a platform token not a UUID'} | ${uuidv4()}   | ${'not-a-token'}
    `(
      'should refuse $description without sending anything',
      async ({
        platformId,
        platformToken,
      }: {
        platformId: string;
        platformToken: string;
      }) => {
        // When
        const call = UserContactApp.contactSalesFromPlatform({
          platformId,
          platformToken,
        });

        // Then
        await expect(call).rejects.toThrow(ErrorCode.InvalidPlatformToken);
        expect(fetchSpy).not.toHaveBeenCalled();
      }
    );

    it('should refuse a trial deployment token used with another platform id', async () => {
      // Given
      const deploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          { platform_id: uuidv4() }
        );

      // When
      const call = UserContactApp.contactSalesFromPlatform({
        platformId: uuidv4(),
        platformToken: deploymentRequest.platform_token!,
      });

      // Then
      await expect(call).rejects.toThrow(ErrorCode.InvalidPlatformToken);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
