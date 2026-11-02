import { useServiceContext } from '@/components/service/components/ServiceContext';
import testRender from '@/utils/test/test-render';
import { describe, expect, it, vi } from 'vitest';

describe('useServiceContext', () => {
  it('should throw when used outside of AppServiceContext', () => {
    // Given
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const OrphanConsumer = () => {
      useServiceContext();
      return null;
    };

    // When / Then
    expect(() => testRender(<OrphanConsumer />)).toThrow(
      'useServiceContext must be used within a ServiceProvider'
    );
  });
});
