import { describe, expect, it } from 'vitest';
import portalConfig from './config';

describe('portalConfig', () => {
  it('should trust exactly one proxy hop when TRUST_PROXY is not set', () => {
    // Given
    // config/default.json and no TRUST_PROXY in the test environment

    // When
    const trustProxy = portalConfig.trust_proxy;

    // Then
    expect(trustProxy).toBe(1);
  });
});
