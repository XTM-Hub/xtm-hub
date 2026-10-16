import {
  AppServiceContext,
  ServiceContextProps,
  useServiceContext,
} from '@/components/service/components/ServiceContext';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import testRender from '@/utils/test/test-render';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const buildContext = (): ServiceContextProps => ({
  serviceInstance: {
    id: 'service-instance-1',
    name: 'OpenCTI integrations',
  } as serviceInstance_fragment$data,
  translationKey: 'Service.OpenctiIntegrations',
  handleAddSheet: vi.fn(),
  handleUpdateSheet: vi.fn(),
  handleDeleteSheet: vi.fn(),
  ServiceForm: vi.fn() as unknown as ServiceContextProps['ServiceForm'],
  type: ShareableResourceType.OPENCTI_INTEGRATION,
  setIntegrationType: vi.fn(),
});

describe('useServiceContext', () => {
  it('should expose the provided values when used inside AppServiceContext', () => {
    // Given
    const context = buildContext();

    // When
    const { result } = renderHook(() => useServiceContext(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <AppServiceContext {...context}>{children}</AppServiceContext>
      ),
    });

    // Then
    expect(result.current).toEqual(context);
  });

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
