import express from 'express';
import { describe, expect, it, vi } from 'vitest';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
} from '../../../tests/tests.const';
import {
  PulsePeriod,
  PulseRegionBucket,
  PulseSectorBucket,
} from '../../__generated__/resolvers-types';
import { PortalContext } from '../../model/portal-context';
import { UnknownErrorCode } from '../../utils/error/error.code';
import { PulseApp } from './pulse.app';
import { PulseErrorCode, PulseErrors } from './pulse.errors';
import pulseResolver from './pulse.resolver';

const PLATFORM_ID = 'platform-abc';
const PLATFORM_TOKEN = 'token-xyz';
const DAY = '2026-10-03';

const makeContext = (
  platformId: string | null = PLATFORM_ID,
  token: string | null = PLATFORM_TOKEN
): PortalContext => ({
  ...contextSimpleUserFiligran2,
  req: {
    headers: {
      'xtm-hub-platform-id': platformId ?? undefined,
      'xtm-hub-platform-token': token ?? undefined,
    },
  } as unknown as express.Request,
  res: {} as express.Response,
});

describe('pulse resolver', () => {
  it('should pass the platform headers to the app', async () => {
    // Given
    const salt = { day: DAY, salt: '000102030405060708090a0b0c0d0e0f' };
    vi.spyOn(PulseApp, 'pulseSalt').mockResolvedValue(salt);

    // When
    const result = await pulseResolver.Query!.pulseSalt!(
      {},
      { day: DAY },
      makeContext(),
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect({
      result,
      calls: vi.mocked(PulseApp.pulseSalt).mock.calls,
    }).toEqual({
      result: salt,
      calls: [[{ platformId: PLATFORM_ID, token: PLATFORM_TOKEN }, DAY]],
    });
  });

  it('should pass missing headers as null', async () => {
    // Given
    vi.spyOn(PulseApp, 'pulseStatus').mockRejectedValue(
      PulseErrors.unauthenticated()
    );

    // When
    const call = pulseResolver.Query!.pulseStatus!(
      {},
      {},
      makeContext(null, null),
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toMatchObject({
      extensions: { code: PulseErrorCode.Unauthenticated },
    });
    expect(PulseApp.pulseStatus).toHaveBeenCalledWith({
      platformId: null,
      token: null,
    });
  });

  it('should keep the contract error code of a Threat Pulse error', async () => {
    // Given
    vi.spyOn(PulseApp, 'pulseTrending').mockRejectedValue(
      PulseErrors.rateLimited(42)
    );

    // When
    const call = pulseResolver.Query!.pulseTrending!(
      {},
      { input: { day: DAY, period: PulsePeriod.Last_7Days } },
      makeContext(),
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toMatchObject({
      extensions: {
        code: PulseErrorCode.RateLimited,
        retry_after_seconds: 42,
      },
    });
  });

  it('should map an unexpected failure to UNKNOWN_ERROR', async () => {
    // Given
    vi.spyOn(PulseApp, 'pushPulse').mockRejectedValue(
      new Error('connection reset')
    );

    // When
    const call = pulseResolver.Mutation!.pushPulse!(
      {},
      {
        input: {
          day: DAY,
          sector_bucket: PulseSectorBucket.Finance,
          region_bucket: PulseRegionBucket.Europe,
          records: [],
        },
      },
      makeContext(),
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toThrow(UnknownErrorCode.UnknownError);
  });

  it('should pass the purge platform id argument to the app', async () => {
    // Given
    vi.spyOn(PulseApp, 'pulsePurge').mockResolvedValue({
      success: true,
      deleted_records: 12,
    });

    // When
    const result = await pulseResolver.Mutation!.pulsePurge!(
      {},
      { platformId: PLATFORM_ID },
      makeContext(),
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect({
      result,
      calls: vi.mocked(PulseApp.pulsePurge).mock.calls,
    }).toEqual({
      result: { success: true, deleted_records: 12 },
      calls: [[{ platformId: PLATFORM_ID, token: PLATFORM_TOKEN }, PLATFORM_ID]],
    });
  });
});
