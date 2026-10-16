import { describe, expect, it, vi } from 'vitest';
import { GRAPHQL_RESOLVE_INFO } from '../../../../tests/tests.const';
import { PortalContext } from '../../../model/portal-context';
import * as hubspot from '../../../thirdparty/hubspot/hubspot';
import { ErrorCode } from '../../../utils/error/error.code';
import userResolver from './user.resolver';

const buildAnonymousContext = (headers: Record<string, string>) =>
  ({
    user: undefined,
    req: { header: (name: string) => headers[name] },
  }) as unknown as PortalContext;

describe('mutation.contactUs', () => {
  it('should refuse an anonymous call without platform credentials', async () => {
    // Given
    const fromPlatformSpy = vi.spyOn(
      hubspot,
      'hubspotReachOutSalesFromPlatformHook'
    );

    // When
    const call = userResolver.Mutation!.contactUs!(
      {},
      { message: 'Please call me' },
      buildAnonymousContext({}),
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toThrow(ErrorCode.InvalidPlatformToken);
    expect(fromPlatformSpy).not.toHaveBeenCalled();
  });

  it('should send the message of a platform calling with its id and token', async () => {
    // Given
    const fromPlatformSpy = vi
      .spyOn(hubspot, 'hubspotReachOutSalesFromPlatformHook')
      .mockResolvedValue();
    const platformId = 'c9e8fee1-8cb4-4fff-b335-5ea350615df4';
    const platformToken = 'b6a1d0c2-3f4e-4a5b-9c8d-7e6f5a4b3c2d';

    // When
    const result = await userResolver.Mutation!.contactUs!(
      {},
      { message: 'Please call me' },
      buildAnonymousContext({
        'XTM-Hub-Platform-Id': platformId,
        'XTM-Hub-Platform-Token': platformToken,
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
});
