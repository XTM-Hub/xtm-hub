import testRender from '@/utils/test/test-render';
import {
  ServiceDefinitionIdentifier,
  ServiceInstanceFilterKey,
} from '@graphql/generated';
import { screen, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import AdminServiceTab, {
  ADMIN_SERVICE_TAB_SERVICE_DEFINITION_IDENTIFIERS,
} from './AdminServiceTab';

vi.mock('@/components/ui/data-table', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui/data-table')>()),
  DataTable: ({ toolbar }: { toolbar?: ReactNode }) => <div>{toolbar}</div>,
}));

vi.mock('@/components/service/EditService', () => ({
  EditService: () => null,
}));

const FILTER_LABEL = 'Service.FilterByService';
const SEARCH_LABEL = 'Service.SearchServices';
const CLEAR_LABEL = 'Utils.Clear';
const PICKED_SERVICE = ServiceDefinitionIdentifier.OpenctiPlaybooks;
const PICKED_SERVICE_LABEL = `Service.ServiceDefinitionIdentifier.${PICKED_SERVICE}`;
const SEARCH_TERM = 'playbook';

const renderAdminServiceTab = () => {
  const refetch = vi.fn();
  const { user } = testRender(
    <AdminServiceTab
      serviceData={[]}
      refetch={refetch}
    />
  );
  return { refetch, user };
};

describe('AdminServiceTab', () => {
  it('should refetch the services of the picked service definition', async () => {
    // Given
    const { refetch, user } = renderAdminServiceTab();

    // When
    await user.click(screen.getByRole('combobox', { name: FILTER_LABEL }));
    await user.click(
      screen.getByRole('option', { name: PICKED_SERVICE_LABEL })
    );

    // Then
    expect(refetch).toHaveBeenLastCalledWith({
      filters: [
        {
          key: ServiceInstanceFilterKey.ServiceDefinitionIdentifier,
          value: [PICKED_SERVICE],
        },
      ],
    });
  });

  it.each([
    ServiceDefinitionIdentifier.OpenctiRegistration,
    ServiceDefinitionIdentifier.OpenaevRegistration,
    ServiceDefinitionIdentifier.XtmoneRegistration,
    ServiceDefinitionIdentifier.XtmPlatformBundle,
  ])(
    'should not offer the non-administrable %s service definition',
    async (identifier) => {
      // Given
      const { user } = renderAdminServiceTab();

      // When
      await user.click(screen.getByRole('combobox', { name: FILTER_LABEL }));

      // Then
      expect(ADMIN_SERVICE_TAB_SERVICE_DEFINITION_IDENTIFIERS).not.toContain(
        identifier
      );
      expect(
        screen.queryByRole('option', {
          name: `Service.ServiceDefinitionIdentifier.${identifier}`,
        })
      ).not.toBeInTheDocument();
    }
  );

  it('should refetch every administrable service when the picked service definition is cleared', async () => {
    // Given
    const { refetch, user } = renderAdminServiceTab();
    await user.click(screen.getByRole('combobox', { name: FILTER_LABEL }));
    await user.click(
      screen.getByRole('option', { name: PICKED_SERVICE_LABEL })
    );

    // When
    await user.click(screen.getByRole('button', { name: CLEAR_LABEL }));

    // Then
    expect(refetch).toHaveBeenLastCalledWith({
      filters: [
        {
          key: ServiceInstanceFilterKey.ServiceDefinitionIdentifier,
          value: ADMIN_SERVICE_TAB_SERVICE_DEFINITION_IDENTIFIERS,
        },
      ],
    });
  });

  it('should refetch with the typed term once typing pauses', async () => {
    // Given
    const { refetch, user } = renderAdminServiceTab();

    // When
    await user.type(
      screen.getByRole('searchbox', { name: SEARCH_LABEL }),
      SEARCH_TERM
    );

    // Then
    await waitFor(() =>
      expect(refetch).toHaveBeenCalledWith({ searchTerm: SEARCH_TERM })
    );
  });
});
