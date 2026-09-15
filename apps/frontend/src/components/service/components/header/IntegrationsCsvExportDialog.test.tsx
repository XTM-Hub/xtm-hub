import { IntegrationsCsvExportDialog } from '@/components/service/components/header/IntegrationsCsvExportDialog';
import {
  INTEGRATION_CSV_EXPORT_COLUMNS,
  toIntegrationCsvColumnLabelKey,
} from '@/components/service/components/header/integrations-csv-export.utils';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import testRender from '@/utils/test/test-render';
import * as FiligranUI from '@filigran/ui';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { downloadIntegrationsCsvMock } = vi.hoisted(() => ({
  downloadIntegrationsCsvMock: vi.fn(),
}));

vi.mock(
  '@/components/service/components/header/integrations-csv-export.utils',
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import('@/components/service/components/header/integrations-csv-export.utils')
    >()),
    downloadIntegrationsCsv: downloadIntegrationsCsvMock,
  })
);

const { storageMock } = vi.hoisted(() => ({
  storageMock: {
    integrationTypes: {} as Record<string, string[]>,
    licenseTypes: {} as Record<string, string[]>,
    solutionCategories: {} as Record<string, string[]>,
    verified: {} as Record<string, string[]>,
    deployable: {} as Record<string, string[]>,
    labels: {} as Record<string, string[]>,
  },
}));

vi.mock(
  '@/components/service/components/ServiceListLocalStorageKeyContext',
  () => ({
    useServiceListLocalStorageKeyContext: () => ({
      localStorageKey: 'OpenCTIIntegrationFeeds',
    }),
  })
);

vi.mock('@/hooks/use-service-list-local-storage', () => ({
  useServiceListLocalStorage: () => storageMock,
}));

vi.mock('@/components/admin/use-case/use-use-cases', () => ({
  useUseCases: () => [
    { id: 'use-case-1', name: 'Threat hunting', color: '#001122' },
  ],
}));

vi.mock('@/components/service/form/UseSolutionCategories', () => ({
  useSolutionCategories: () => [
    { id: 'category-1', name: 'Threat Intelligence' },
  ],
}));

const EMPTY_FILTERS = {
  integrationTypes: [],
  useCases: [],
  licenseTypes: [],
  solutionCategories: [],
  verified: [],
  deployable: [],
};

const openColumnsCombobox = async (
  user: ReturnType<typeof testRender>['user']
) => {
  await user.click(screen.getByTestId('integrations-csv-export-columns'));
  return screen.getByRole('listbox');
};

describe('IntegrationsCsvExportDialog', () => {
  beforeEach(() => {
    downloadIntegrationsCsvMock.mockReset();
    vi.spyOn(FiligranUI, 'toast').mockImplementation(() => undefined);
    storageMock.integrationTypes = {};
    storageMock.licenseTypes = {};
    storageMock.solutionCategories = {};
    storageMock.verified = {};
    storageMock.deployable = {};
    storageMock.labels = {};
  });

  it('renders every selectable column in the columns combobox', async () => {
    // Given
    const { user } = testRender(
      <IntegrationsCsvExportDialog
        open={true}
        setOpen={vi.fn()}
        serviceInstanceId="service-1"
        type={ShareableResourceType.OPENCTI_INTEGRATION}
      />
    );

    // When
    const listbox = await openColumnsCombobox(user);

    // Then
    INTEGRATION_CSV_EXPORT_COLUMNS.forEach((column) => {
      expect(
        within(listbox).getByText(
          `Service.CsvExport.Columns.${toIntegrationCsvColumnLabelKey(column.key)}`
        )
      ).toBeInTheDocument();
    });
  });

  it('exports with every column selected by default', async () => {
    // Given
    downloadIntegrationsCsvMock.mockResolvedValue(undefined);
    const setOpen = vi.fn();
    testRender(
      <IntegrationsCsvExportDialog
        open={true}
        setOpen={setOpen}
        serviceInstanceId="service-1"
        type={ShareableResourceType.OPENCTI_INTEGRATION}
      />
    );

    // When
    fireEvent.click(
      screen.getByRole('button', { name: 'Service.CsvExport.ExportButton' })
    );

    // Then
    await waitFor(() => {
      expect(downloadIntegrationsCsvMock).toHaveBeenCalledWith(
        'service-1',
        INTEGRATION_CSV_EXPORT_COLUMNS.map((column) => column.key),
        EMPTY_FILTERS
      );
    });
    expect(FiligranUI.toast).toHaveBeenCalledWith({
      title: 'Service.CsvExport.SuccessToast',
    });
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it('exports only the remaining columns after deselecting one from the combobox', async () => {
    // Given
    downloadIntegrationsCsvMock.mockResolvedValue(undefined);
    const { user } = testRender(
      <IntegrationsCsvExportDialog
        open={true}
        setOpen={vi.fn()}
        serviceInstanceId="service-1"
        type={ShareableResourceType.OPENCTI_INTEGRATION}
      />
    );
    const deselected = INTEGRATION_CSV_EXPORT_COLUMNS[0];

    // When: deselect the first column, then export
    const listbox = await openColumnsCombobox(user);
    await user.click(
      within(listbox).getByText(
        `Service.CsvExport.Columns.${toIntegrationCsvColumnLabelKey(deselected.key)}`
      )
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Service.CsvExport.ExportButton' })
    );

    // Then: the exported columns keep the canonical order, minus the deselected one
    await waitFor(() => {
      expect(downloadIntegrationsCsvMock).toHaveBeenCalledWith(
        'service-1',
        INTEGRATION_CSV_EXPORT_COLUMNS.slice(1).map((column) => column.key),
        EMPTY_FILTERS
      );
    });
  });

  it('blocks the export and shows a validation message once every column is cleared', async () => {
    // Given
    const { user } = testRender(
      <IntegrationsCsvExportDialog
        open={true}
        setOpen={vi.fn()}
        serviceInstanceId="service-1"
        type={ShareableResourceType.OPENCTI_INTEGRATION}
      />
    );

    // When
    const listbox = await openColumnsCombobox(user);
    await user.click(within(listbox).getByText('Clear'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Service.CsvExport.ExportButton' })
    );

    // Then
    await waitFor(() => {
      expect(downloadIntegrationsCsvMock).not.toHaveBeenCalled();
    });
  });

  it('shows an error toast and keeps the dialog open when the download fails', async () => {
    // Given
    downloadIntegrationsCsvMock.mockRejectedValue(new Error('boom'));
    const setOpen = vi.fn();
    testRender(
      <IntegrationsCsvExportDialog
        open={true}
        setOpen={setOpen}
        serviceInstanceId="service-1"
        type={ShareableResourceType.OPENCTI_INTEGRATION}
      />
    );

    // When
    fireEvent.click(
      screen.getByRole('button', { name: 'Service.CsvExport.ExportButton' })
    );

    // Then
    await waitFor(() => {
      expect(FiligranUI.toast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Utils.Error',
        description: <>Service.CsvExport.ErrorToast</>,
      });
    });
    expect(setOpen).not.toHaveBeenCalledWith(false);
  });

  it('resets the selection and closes when cancel is clicked', () => {
    // Given
    const setOpen = vi.fn();
    testRender(
      <IntegrationsCsvExportDialog
        open={true}
        setOpen={setOpen}
        serviceInstanceId="service-1"
        type={ShareableResourceType.OPENCTI_INTEGRATION}
      />
    );

    // When
    fireEvent.click(screen.getByRole('button', { name: 'Utils.Cancel' }));

    // Then
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it("pre-fills the verified filter from the list's current filter", () => {
    // Given
    storageMock.verified = { true: [] };

    // When
    testRender(
      <IntegrationsCsvExportDialog
        open={true}
        setOpen={vi.fn()}
        serviceInstanceId="service-1"
        type={ShareableResourceType.OPENCTI_INTEGRATION}
      />
    );

    // Then: the placeholder is replaced by the pre-selected value's label
    expect(
      within(
        screen.getByTestId('integrations-csv-export-filter-verified')
      ).getByText('Service.OpenctiIntegrations.Filter.Verified.Verified')
    ).toBeInTheDocument();
  });

  it('exports the filter edited in the dialog without mutating the stored list filters', async () => {
    // Given
    downloadIntegrationsCsvMock.mockResolvedValue(undefined);
    const { user } = testRender(
      <IntegrationsCsvExportDialog
        open={true}
        setOpen={vi.fn()}
        serviceInstanceId="service-1"
        type={ShareableResourceType.OPENCTI_INTEGRATION}
      />
    );

    // When: select "Verified" in the dialog's own verified filter
    await user.click(
      screen.getByTestId('integrations-csv-export-filter-verified')
    );
    await user.click(
      within(screen.getByRole('listbox')).getByText(
        'Service.OpenctiIntegrations.Filter.Verified.Verified'
      )
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Service.CsvExport.ExportButton' })
    );

    // Then: the export uses the dialog's own selection, the list's stored filter is untouched
    await waitFor(() => {
      expect(downloadIntegrationsCsvMock).toHaveBeenCalledWith(
        'service-1',
        INTEGRATION_CSV_EXPORT_COLUMNS.map((column) => column.key),
        { ...EMPTY_FILTERS, verified: ['true'] }
      );
    });
    expect(storageMock.verified).toEqual({});
  });
});
