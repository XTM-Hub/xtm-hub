import { describe, expect, it, vi } from 'vitest';
import {
  contextAdminSecondOrga,
  GRAPHQL_RESOLVE_INFO,
} from '../../../../tests/tests.const';
import { PortalContext } from '../../../model/portal-context';
import { ErrorCode } from '../../../utils/error/error.code';
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
