import { useServiceListLocalStorageKeyContext } from '@/components/service/components/ServiceListLocalStorageKeyContext';
import testRender from '@/utils/test/test-render';
import { describe, expect, it, vi } from 'vitest';

describe('useServiceListLocalStorageKeyContext', () => {
  it('should throw when used outside of AppServiceListLocalStorageKeyContext', () => {
    // Given
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const OrphanConsumer = () => {
      useServiceListLocalStorageKeyContext();
      return null;
    };

    // When / Then
    expect(() => testRender(<OrphanConsumer />)).toThrow(
      'useServiceListLocalStorageKey must be used within a ServiceProvider'
    );
  });
});
