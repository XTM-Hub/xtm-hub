import type { Request, Response } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FeatureFlag } from '../../../__generated__/resolvers-types';
import * as FeatureFlagUtil from '../../../utils/feature-flag.util';
import { requireFeatureFlag } from './feature-flag-guard.util';

const REQUEST = {} as Request;
const RESPONSE = {} as Response;

describe('requireFeatureFlag', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call next without answering when the flag is enabled', () => {
    // Given
    vi.spyOn(FeatureFlagUtil, 'isFeatureEnabled').mockReturnValue(true);
    const sendFeatureNotAvailable = vi.fn();
    const next = vi.fn();
    const guard = requireFeatureFlag(
      FeatureFlag.DecouplingConnectors,
      sendFeatureNotAvailable
    );

    // When
    guard(REQUEST, RESPONSE, next);

    // Then
    expect(next).toHaveBeenCalledOnce();
    expect(sendFeatureNotAvailable).not.toHaveBeenCalled();
  });

  it('should answer with the endpoint error and stop the chain when the flag is paused', () => {
    // Given
    const sendFeatureNotAvailable = vi.fn();
    const next = vi.fn();
    const guard = requireFeatureFlag(
      FeatureFlag.DecouplingConnectors,
      sendFeatureNotAvailable
    );

    // When
    guard(REQUEST, RESPONSE, next);

    // Then
    expect(sendFeatureNotAvailable).toHaveBeenCalledWith(RESPONSE);
    expect(next).not.toHaveBeenCalled();
  });
});
