import { GraphQLResolveInfo } from 'graphql';
import { v4 as uuidv4 } from 'uuid';
import type { MockInstance } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  contextSimpleUserSecondOrga,
  requestContextRegistererUserSecondOrga,
  TEST_ORGANIZATIONS,
} from '../../../tests/tests.const';
import {
  PlatformContract,
  PlatformIdentifier,
  PlatformInput,
  PlatformRegistrationConnectivityStatus,
} from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import { PortalContext } from '../../model/portal-context';
import { BadRequestErrorCode } from '../../utils/error/error.code';
import { ErrorType } from '../../utils/error/error.type';
import { PLATFORM_TOKEN_HEADER } from '../security-management/token/platform-token.util';
import { RegistrationApp } from './registration.app';
import registrationResolver from './registration.resolver';

const PLATFORM_TOKEN = uuidv4();

const contextWithPlatformToken = {
  ...contextSimpleUserSecondOrga,
  req: { headers: { [PLATFORM_TOKEN_HEADER]: PLATFORM_TOKEN } },
} as PortalContext;

const platformInput: PlatformInput = {
  id: uuidv4(),
  url: 'http://example.com',
  title: 'My platform',
  contract: PlatformContract.Ce,
  version: 'X.Y.Z',
};

describe('registration query resolver', () => {
  describe('openCTIPlatformRegistrationStatus', () => {
    it('should return inactive when platform is not registered', async () => {
      expect(
        registrationResolver.Query?.openCTIPlatformRegistrationStatus
      ).toBeDefined();
      if (!registrationResolver.Query?.openCTIPlatformRegistrationStatus) {
        return;
      }
      const result =
        await registrationResolver.Query.openCTIPlatformRegistrationStatus(
          {},
          { input: { platformId: uuidv4(), token: uuidv4() } },
          contextSimpleUserSecondOrga,
          {} as GraphQLResolveInfo
        );

      expect(result?.status).toBe(
        PlatformRegistrationConnectivityStatus.Inactive
      );
    });
    it('should return active when platform is registered', async () => {
      requestContext.set(requestContextRegistererUserSecondOrga);

      expect(
        registrationResolver.Query?.openCTIPlatformRegistrationStatus
      ).toBeDefined();
      if (!registrationResolver.Query?.openCTIPlatformRegistrationStatus) {
        return;
      }

      const platformId = uuidv4();
      const { token } = await RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform: {
          id: platformId,
          url: 'http://example.com',
          contract: PlatformContract.Ee,
          title: 'Fake title',
          version: '1.0.0',
        },
        identifier: PlatformIdentifier.Opencti,
      });

      const result =
        await registrationResolver.Query.openCTIPlatformRegistrationStatus(
          {},
          { input: { platformId, token } },
          contextSimpleUserSecondOrga,
          {} as GraphQLResolveInfo
        );

      expect(result.status).toBe(PlatformRegistrationConnectivityStatus.Active);
    });
  });

  describe('autoRegisterPlatform', () => {
    let autoRegisterSpy: MockInstance;

    beforeEach(() => {
      autoRegisterSpy = vi
        .spyOn(RegistrationApp, 'autoRegisterPlatform')
        .mockResolvedValue();
    });

    afterEach(() => {
      autoRegisterSpy.mockRestore();
    });

    it('should throw when neither platform nor input is provided', async () => {
      const call = registrationResolver.Mutation!.autoRegisterPlatform!(
        {},
        {},
        contextWithPlatformToken,
        {} as GraphQLResolveInfo
      );

      await expect(call).rejects.toMatchObject({
        name: ErrorType.BadRequest,
        message: BadRequestErrorCode.MissingAutoRegisterPlatformArgument,
      });
    });

    it('should use the deprecated platform arg when input is not provided', async () => {
      await registrationResolver.Mutation!.autoRegisterPlatform!(
        {},
        { platform: platformInput, input: null },
        contextWithPlatformToken,
        {} as GraphQLResolveInfo
      );

      expect(autoRegisterSpy).toHaveBeenCalledWith(PLATFORM_TOKEN, {
        platform: platformInput,
      });
    });

    it('should prefer input.platform over the deprecated platform arg', async () => {
      const inputPlatform: PlatformInput = { ...platformInput, id: uuidv4() };

      await registrationResolver.Mutation!.autoRegisterPlatform!(
        {},
        {
          platform: platformInput,
          input: { platform: inputPlatform },
        },
        contextWithPlatformToken,
        {} as GraphQLResolveInfo
      );

      expect(autoRegisterSpy).toHaveBeenCalledWith(PLATFORM_TOKEN, {
        platform: inputPlatform,
      });
    });
  });
});
