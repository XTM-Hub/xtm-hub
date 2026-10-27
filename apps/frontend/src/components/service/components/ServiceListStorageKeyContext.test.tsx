import { useServiceListStorageKeyContext } from '@/components/service/components/ServiceListStorageKeyContext';
import testRender from '@/utils/test/test-render';
import { describe, expect, it, vi } from 'vitest';

describe('useServiceListStorageKeyContext', () => {
  it('should throw when used outside of AppServiceListStorageKeyContext', () => {
    // Given
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const OrphanConsumer = () => {
      useServiceListStorageKeyContext();
      return null;
    };

    // When / Then
    expect(() => testRender(<OrphanConsumer />)).toThrow(
      'useServiceListStorageKey must be used within a ServiceProvider'
    );
  });
});
