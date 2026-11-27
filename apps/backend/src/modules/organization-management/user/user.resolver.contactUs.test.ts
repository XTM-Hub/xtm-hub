import { v4 as uuidv4 } from 'uuid';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import {
  contextAdminSecondOrga,
  GRAPHQL_RESOLVE_INFO,
} from '../../../../tests/tests.const';
import { PortalContext } from '../../../model/portal-context';
import {
  ErrorCode,
  UnauthenticatedErrorCode,
} from '../../../utils/error/error.code';
import { UserContactApp } from './user-contact/user-contact.app';
import userResolver from './user.resolver';

// Express lowercases the header names of a request.
const buildContext = ({
  user,
  headers = {},
}: {
  user?: PortalContext['user'];
  headers?: Record<string, string>;
}) =>
  ({
    user,
    req: { headers },
  }) as unknown as PortalContext;

describe('mutation.contactUs', () => {
  it('should refuse an anonymous call without platform credentials', async () => {
    // Given
    const fromPlatformSpy = vi.spyOn(
      UserContactApp,
      'contactSalesFromPlatform'
    );

    // When
    const call = userResolver.Mutation!.contactUs!(
      {},
      { message: 'Please call me' },
      buildContext({}),
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toThrow(ErrorCode.InvalidPlatformToken);
    expect(fromPlatformSpy).not.toHaveBeenCalled();
  });

  it('should send the message of a platform calling with its id and token', async () => {
    // Given
    const fromPlatformSpy = vi
      .spyOn(UserContactApp, 'contactSalesFromPlatform')
      .mockResolvedValue();
    const platformId = 'c9e8fee1-8cb4-4fff-b335-5ea350615df4';
    const platformToken = 'b6a1d0c2-3f4e-4a5b-9c8d-7e6f5a4b3c2d';

    // When
    const result = await userResolver.Mutation!.contactUs!(
      {},
      { message: 'Please call me' },
      buildContext({
        headers: {
          'xtm-hub-platform-id': platformId,
          'xtm-hub-platform-token': platformToken,
        },
      }),
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(result).toEqual({ success: true });
    expect(fromPlatformSpy).toHaveBeenCalledWith({
      message: 'Please call me',
      platformId,
      platformToken,
    });
  });

  it('should send the message of a signed-in Hub user through the Hub user flow', async () => {
    // Given
    const fromPlatformSpy = vi.spyOn(
      UserContactApp,
      'contactSalesFromPlatform'
    );
    const hubUserSpy = vi
      .spyOn(UserContactApp, 'contactSales')
      .mockResolvedValue();
    const platformId = 'c9e8fee1-8cb4-4fff-b335-5ea350615df4';

    // When
    const result = await userResolver.Mutation!.contactUs!(
      {},
      { message: 'Please call me', platformId },
      buildContext({ user: contextAdminSecondOrga.user }),
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(result).toEqual({ success: true });
    expect(hubUserSpy).toHaveBeenCalledWith({
      message: 'Please call me',
      platformId,
      platformToken: undefined,
      platformIdentifier: undefined,
      deploymentRequestType: undefined,
    });
    expect(fromPlatformSpy).not.toHaveBeenCalled();
  });

  it('should return the error of a Hub user flow that refuses the contact request', async () => {
    // Given
    vi.spyOn(UserContactApp, 'contactSales').mockRejectedValue(
      new Error(ErrorCode.DeploymentRequestNotFound)
    );

    // When
    const call = userResolver.Mutation!.contactUs!(
      {},
      {
        message: 'Please call me',
        platformId: 'c9e8fee1-8cb4-4fff-b335-5ea350615df4',
      },
      buildContext({ user: contextAdminSecondOrga.user }),
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toThrow(ErrorCode.DeploymentRequestNotFound);
  });
});

describe('mutation.contactUs from a platform that enrolled a key', () => {
  const MESSAGE = 'Please call me';
  const cleanups: (() => Promise<void>)[] = [];

  const givenKeyedCaller = async () => {
    const caller = await TestHelper.keyedPlatformCaller.create();
    cleanups.push(caller.cleanup);
    return caller;
  };

  const contactUs = (headers: Record<string, string>) =>
    userResolver.Mutation!.contactUs!(
      {},
      { message: MESSAGE },
      buildContext({ headers }),
      GRAPHQL_RESOLVE_INFO
    );

  afterEach(async () => {
    await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
  });

  it('should send the message of the registration the assertion authenticates', async () => {
    // Given
    const caller = await givenKeyedCaller();
    const fromPlatformSpy = vi
      .spyOn(UserContactApp, 'contactSalesFromPlatform')
      .mockResolvedValue();

    // When
    const result = await contactUs(
      TestHelper.keyedPlatformCaller.assertionHeaders(await caller.sign())
    );

    // Then
    expect(result).toEqual({ success: true });
    expect(fromPlatformSpy).toHaveBeenCalledExactlyOnceWith({
      message: MESSAGE,
      registration: expect.objectContaining({
        platformConfiguration: expect.objectContaining({
          service_instance_id: caller.serviceInstanceId,
        }),
      }),
    });
  });

  it('should refuse with PLATFORM_ASSERTION_INVALID an assertion sent a second time', async () => {
    // Given
    const caller = await givenKeyedCaller();
    const headers = TestHelper.keyedPlatformCaller.assertionHeaders(
      await caller.sign()
    );
    const fromPlatformSpy = vi
      .spyOn(UserContactApp, 'contactSalesFromPlatform')
      .mockResolvedValue();
    await contactUs(headers);
    fromPlatformSpy.mockClear();

    // When
    const call = contactUs(headers);

    // Then
    await expect(call).rejects.toMatchObject({
      message: UnauthenticatedErrorCode.PlatformAssertionInvalid,
      extensions: { code: UnauthenticatedErrorCode.PlatformAssertionInvalid },
    });
    expect(fromPlatformSpy).not.toHaveBeenCalled();
  });

  it('should refuse with PLATFORM_TOKEN_REFUSED the revoked token of the platform', async () => {
    // Given
    const caller = await givenKeyedCaller();
    const fromPlatformSpy = vi.spyOn(
      UserContactApp,
      'contactSalesFromPlatform'
    );

    // When
    const call = contactUs({
      'xtm-hub-platform-id': caller.platformId,
      'xtm-hub-platform-token': uuidv4(),
    });

    // Then
    await expect(call).rejects.toMatchObject({
      message: UnauthenticatedErrorCode.PlatformTokenRefused,
      extensions: { code: UnauthenticatedErrorCode.PlatformTokenRefused },
    });
    expect(fromPlatformSpy).not.toHaveBeenCalled();
  });
});
