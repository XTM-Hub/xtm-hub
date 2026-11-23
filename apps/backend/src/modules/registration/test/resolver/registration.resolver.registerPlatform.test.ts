import { toGlobalId } from 'graphql-relay/node/node.js';
import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
  TEST_ORGANIZATIONS,
} from '../../../../../tests/tests.const';
import {
  PlatformContract,
  PlatformIdentifier,
  RegisterPlatformInput,
} from '../../../../__generated__/resolvers-types';
import { BadRequestErrorCode } from '../../../../utils/error/error.code';
import { ErrorType } from '../../../../utils/error/error.type';
import { RegistrationApp } from '../../registration.app';
import registrationResolver from '../../registration.resolver';

describe('mutation.registerPlatform', () => {
  it.each`
    organizationType                      | description
    ${'Organization'}                     | ${'standard Organization global id'}
    ${'IsPlatformRegisteredOrganization'} | ${'isPlatformRegistered organization global id'}
  `(
    'should decode $description before calling registrationApp and return the token',
    async ({ organizationType }) => {
      // Given
      const rawOrgId = TEST_ORGANIZATIONS.FILIGRAN.ID;
      const globalOrgId = toGlobalId(organizationType, rawOrgId);
      const generatedToken = uuidv4();
      const platformInput = {
        id: uuidv4(),
        url: 'http://example.com',
        title: 'My Platform',
        contract: PlatformContract.Ee,
        version: '1.0.0',
      };
      const input: RegisterPlatformInput = {
        organizationId: globalOrgId,
        platform: platformInput,
        identifier: PlatformIdentifier.Opencti,
      };
      vi.spyOn(RegistrationApp, 'registerPlatform').mockResolvedValue(
        generatedToken
      );

      // When
      const result = await registrationResolver.Mutation!.registerPlatform!(
        {},
        { input },
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(RegistrationApp.registerPlatform).toHaveBeenCalledWith({
        ...input,
        organizationId: rawOrgId,
      });
      expect(result).toMatchObject({ token: generatedToken });
    }
  );

  it('should keep organizationId unchanged when is not encoded', async () => {
    // Given
    const rawOrgId = TEST_ORGANIZATIONS.FILIGRAN.ID;
    const generatedToken = uuidv4();
    const platformInput = {
      id: uuidv4(),
      url: 'http://example.com',
      title: 'My Platform',
      contract: PlatformContract.Ee,
      version: '1.0.0',
    };
    const input: RegisterPlatformInput = {
      organizationId: rawOrgId,
      platform: platformInput,
      identifier: PlatformIdentifier.Opencti,
    };
    vi.spyOn(RegistrationApp, 'registerPlatform').mockResolvedValue(
      generatedToken
    );

    // When
    const result = await registrationResolver.Mutation!.registerPlatform!(
      {},
      { input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(RegistrationApp.registerPlatform).toHaveBeenCalledWith(input);
    expect(result).toMatchObject({ token: generatedToken });
  });

  it('should return the name of the organization the platform was registered in', async () => {
    // Given
    const input: RegisterPlatformInput = {
      organizationId: toGlobalId(
        'Organization',
        TEST_ORGANIZATIONS.FILIGRAN.ID
      ),
      platform: {
        id: uuidv4(),
        url: 'http://example.com',
        title: 'My Platform',
        contract: PlatformContract.Ee,
        version: '1.0.0',
      },
      identifier: PlatformIdentifier.Opencti,
    };
    vi.spyOn(RegistrationApp, 'registerPlatform').mockResolvedValue(uuidv4());

    // When
    const result = await registrationResolver.Mutation!.registerPlatform!(
      {},
      { input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(result).toMatchObject({
      organizationName: TEST_ORGANIZATIONS.FILIGRAN.NAME,
    });
  });

  it('should map to BadRequest for InvalidPlatformVersion error', async () => {
    // Given
    const input: RegisterPlatformInput = {
      organizationId: toGlobalId(
        'Organization',
        TEST_ORGANIZATIONS.FILIGRAN.ID
      ),
      platform: {
        id: uuidv4(),
        url: 'http://example.com',
        title: 'My Platform',
        contract: PlatformContract.Ee,
        version: '1.0.0',
      },
      identifier: PlatformIdentifier.Opencti,
    };
    vi.spyOn(RegistrationApp, 'registerPlatform').mockRejectedValue(
      new Error(BadRequestErrorCode.InvalidPlatformVersion)
    );

    // When
    const call = registrationResolver.Mutation!.registerPlatform!(
      {},
      { input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toMatchObject({ name: ErrorType.BadRequest });
  });
});
