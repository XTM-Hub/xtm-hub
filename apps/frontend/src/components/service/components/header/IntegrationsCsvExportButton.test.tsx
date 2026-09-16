import { IntegrationsCsvExportButton } from '@/components/service/components/header/IntegrationsCsvExportButton';
import { buildLoginRedirect } from '@/utils/redirect';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import testRender from '@/utils/test/test-render';
import { fireEvent, screen } from '@testing-library/react';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useRouter } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();

vi.mock(
  '@/components/service/components/ServiceListLocalStorageKeyContext',
  () => ({
    useServiceListLocalStorageKeyContext: () => ({
      localStorageKey: 'OpenCTIIntegrationFeeds',
    }),
  })
);

vi.mock('@/hooks/use-service-list-local-storage', () => ({
  useServiceListLocalStorage: () => ({
    integrationTypes: {},
    licenseTypes: {},
    solutionCategories: {},
    verified: {},
    deployable: {},
    labels: {},
  }),
}));

vi.mock('@/components/admin/use-case/use-use-cases', () => ({
  useUseCases: () => [],
}));

vi.mock('@/components/service/form/UseSolutionCategories', () => ({
  useSolutionCategories: () => [],
}));

describe('IntegrationsCsvExportButton', () => {
  beforeEach(() => {
    pushMock.mockReset();
    vi.mocked(useRouter).mockReturnValue({
      push: pushMock,
    } as unknown as AppRouterInstance);
  });

  it('opens the export dialog when authenticated', () => {
    // Given
    testRender(
      <IntegrationsCsvExportButton
        serviceInstanceId="service-1"
        isAuthenticated
        type={ShareableResourceType.OPENCTI_INTEGRATION}
      />
    );

    // When
    fireEvent.click(
      screen.getByRole('button', { name: 'Service.CsvExport.TriggerButton' })
    );

    // Then
    expect(
      screen.getByText('Service.CsvExport.DialogTitle')
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('redirects to login instead of opening the dialog when logged out', () => {
    // Given
    testRender(
      <IntegrationsCsvExportButton
        serviceInstanceId="service-1"
        isAuthenticated={false}
        loginRedirectPath="/app/service/opencti_integrations/service-1"
        type={ShareableResourceType.OPENCTI_INTEGRATION}
      />
    );

    // When
    fireEvent.click(
      screen.getByRole('button', { name: 'Service.CsvExport.TriggerButton' })
    );

    // Then
    expect(pushMock).toHaveBeenCalledWith(
      buildLoginRedirect('/app/service/opencti_integrations/service-1')
    );
    expect(
      screen.queryByText('Service.CsvExport.DialogTitle')
    ).not.toBeInTheDocument();
  });
});
