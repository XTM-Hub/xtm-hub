import { useUseCases } from '@/components/admin/use-case/use-use-cases';
import {
  downloadIntegrationsCsv,
  INTEGRATION_CSV_EXPORT_COLUMNS,
  IntegrationCsvExportFilters,
  toIntegrationCsvColumnLabelKey,
} from '@/components/service/components/header/integrations-csv-export.utils';
import { useServiceListLocalStorageKeyContext } from '@/components/service/components/ServiceListLocalStorageKeyContext';
import { useSolutionCategories } from '@/components/service/form/UseSolutionCategories';
import { availableIntegrationTypes } from '@/components/service/integrations/Integration.utils';
import { AppCombobox } from '@/components/ui/AppCombobox';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useServiceListLocalStorage } from '@/hooks/use-service-list-local-storage';
import { useTranslate } from '@/hooks/use-translate';
import { toComboboxOptionIds } from '@/utils/design-system/combobox';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@filigran/design-system';
import { AutoForm, Label, useFormField } from '@filigran/ui';
import {
  FiligranProduct,
  IntegrationType,
  LicenseType,
} from '@graphql/generated';
import { useMemo, useState } from 'react';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';
import { z } from 'zod';

interface IntegrationsCsvExportDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  serviceInstanceId: string;
  type: string;
}

const defaultSelectedColumns = () =>
  INTEGRATION_CSV_EXPORT_COLUMNS.map((column) => column.key);

const toCanonicalOrder = (selectedKeys: string[]): string[] =>
  INTEGRATION_CSV_EXPORT_COLUMNS.map((column) => column.key).filter((key) =>
    selectedKeys.includes(key)
  );

const csvExportFormSchema = z.object({
  columns: z.array(z.string()).min(1),
  integration_type: z.array(z.string()).optional(),
  use_case: z.array(z.string()).optional(),
  license_type: z.array(z.string()).optional(),
  solution_category: z.array(z.string()).optional(),
  verified: z.array(z.string()).optional(),
  manager_supported: z.array(z.string()).optional(),
});
type CsvExportFormValues = z.infer<typeof csvExportFormSchema>;

interface IntegrationsCsvExportFilterFieldProps {
  field: ControllerRenderProps<FieldValues, string>;
  options: Array<{ label: string; value: string }>;
  label: string;
  placeholder: string;
  testId: string;
}

const IntegrationsCsvExportFilterField = ({
  field,
  options,
  label,
  placeholder,
  testId,
}: IntegrationsCsvExportFilterFieldProps) => {
  const { error } = useFormField();
  const optionIds = useMemo(
    () =>
      toComboboxOptionIds(
        options,
        (option) => option.value,
        (option) => option.label
      ),
    [options]
  );
  return (
    <AppCombobox
      multiple
      className="min-w-0 max-w-md"
      label={label}
      placeholder={placeholder}
      error={error?.message}
      data-testid={testId}
      options={optionIds.ids}
      value={field.value ?? []}
      onValueChange={field.onChange}
      getOptionLabel={optionIds.getOptionLabel}
    />
  );
};

export const IntegrationsCsvExportDialog = ({
  open,
  setOpen,
  serviceInstanceId,
  type,
}: IntegrationsCsvExportDialogProps) => {
  const t = useTranslate();
  const [isExporting, setIsExporting] = useState(false);

  const { localStorageKey } = useServiceListLocalStorageKeyContext();
  const {
    integrationTypes,
    licenseTypes,
    solutionCategories: storedSolutionCategories,
    verified,
    deployable,
    labels,
  } = useServiceListLocalStorage(localStorageKey);

  const [seededValues, setSeededValues] = useState<CsvExportFormValues>(() => ({
    columns: defaultSelectedColumns(),
    integration_type: [],
    use_case: [],
    license_type: [],
    solution_category: [],
    verified: [],
    manager_supported: [],
  }));
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setSeededValues({
      columns: defaultSelectedColumns(),
      integration_type: Object.keys(integrationTypes),
      use_case: Object.keys(labels),
      license_type: Object.keys(licenseTypes),
      solution_category: Object.keys(storedSolutionCategories),
      verified: Object.keys(verified),
      manager_supported: Object.keys(deployable),
    });
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const columnOptions = useMemo(
    () =>
      INTEGRATION_CSV_EXPORT_COLUMNS.map((column) => ({
        value: column.key,
        label: t(
          `Service.CsvExport.Columns.${toIntegrationCsvColumnLabelKey(column.key)}`
        ),
      })),
    [t]
  );

  const integrationTypeOptions = useMemo(() => {
    const allOptions = Object.values(IntegrationType).map((feedType) => ({
      label: t(`Service.OpenctiIntegrations.Type.${feedType}`),
      value: feedType.toString(),
    }));
    const available = allOptions
      .filter((option) =>
        availableIntegrationTypes.includes(option.value as IntegrationType)
      )
      .sort((a, b) => a.label.localeCompare(b.label));
    const comingSoon = allOptions
      .filter(
        (option) =>
          !availableIntegrationTypes.includes(option.value as IntegrationType)
      )
      .sort((a, b) => a.label.localeCompare(b.label));
    return [...available, ...comingSoon];
  }, [t]);

  const licenseTypeOptions = useMemo(
    () => [
      {
        label: t('Service.OpenctiIntegrations.Filter.LicenseType.Free'),
        value: LicenseType.Free,
      },
      {
        label: t('Service.OpenctiIntegrations.Filter.LicenseType.Commercial'),
        value: LicenseType.Commercial,
      },
    ],
    [t]
  );

  const verifiedOptions = useMemo(
    () => [
      {
        label: t('Service.OpenctiIntegrations.Filter.Verified.Verified'),
        value: 'true',
      },
      {
        label: t('Service.OpenctiIntegrations.Filter.Verified.Unverified'),
        value: 'false',
      },
    ],
    [t]
  );

  const deployableOptions = useMemo(
    () => [
      {
        label: t(
          'Service.OpenctiIntegrations.Filter.ManagerSupported.AutomaticDeploy'
        ),
        value: 'true',
      },
      {
        label: t(
          'Service.OpenctiIntegrations.Filter.ManagerSupported.ManualDeploy'
        ),
        value: 'false',
      },
    ],
    [t]
  );

  const solutionCategories = useSolutionCategories(FiligranProduct.Opencti);
  const solutionCategoryOptions = useMemo(
    () =>
      solutionCategories.map((category) => ({
        label: category.name,
        value: category.id,
      })),
    [solutionCategories]
  );

  const useCases = useUseCases({ documentType: type });
  const useCaseOptions = useMemo(
    () => useCases.map(({ name, id }) => ({ label: name, value: id })),
    [useCases]
  );

  const resetAndClose = () => {
    setOpen(false);
  };

  const handleExport = async (values: CsvExportFormValues) => {
    setIsExporting(true);
    try {
      const filters: IntegrationCsvExportFilters = {
        integrationTypes: values.integration_type,
        useCases: values.use_case,
        licenseTypes: values.license_type,
        solutionCategories: values.solution_category,
        verified: values.verified,
        deployable: values.manager_supported,
      };
      await downloadIntegrationsCsv(
        serviceInstanceId,
        toCanonicalOrder(values.columns),
        filters
      );
      showSnackbar({
        severity: 'success',
        title: t('Service.CsvExport.SuccessToast'),
      });
      resetAndClose();
    } catch {
      showSnackbar({
        severity: 'error',
        title: t('Utils.Error'),
        description: <>{t('Service.CsvExport.ErrorToast')}</>,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) resetAndClose();
        else setOpen(value);
      }}>
      <DialogContent>
        <DialogTitle>{t('Service.CsvExport.DialogTitle')}</DialogTitle>
        <DialogDescription className="sr-only">
          {t('Service.CsvExport.DialogDescription')}
        </DialogDescription>

        <DialogBody>
          <AutoForm
            values={seededValues}
            formSchema={csvExportFormSchema}
            onSubmit={handleExport}
            fieldConfig={{
              columns: {
                fieldType: ({
                  field,
                }: {
                  field: ControllerRenderProps<FieldValues, string>;
                }) => (
                  <IntegrationsCsvExportFilterField
                    field={field}
                    options={columnOptions}
                    label={t('Service.CsvExport.ColumnsLabel')}
                    placeholder={t('Service.CsvExport.ColumnsPlaceholder')}
                    testId="integrations-csv-export-columns"
                  />
                ),
              },
              integration_type: {
                fieldType: ({ field }) => (
                  <>
                    <Label>{t('Service.CsvExport.FiltersLabel')}</Label>
                    <IntegrationsCsvExportFilterField
                      field={field}
                      options={integrationTypeOptions}
                      label={t('Service.OpenctiIntegrations.Filter.Type.Label')}
                      placeholder={t(
                        'Service.OpenctiIntegrations.Filter.Type.Placeholder'
                      )}
                      testId="integrations-csv-export-filter-integration-type"
                    />
                  </>
                ),
              },
              use_case: {
                fieldType: ({ field }) => (
                  <IntegrationsCsvExportFilterField
                    field={field}
                    options={useCaseOptions}
                    label={t('GenericActions.FilterUseCasesLabel')}
                    placeholder={t('GenericActions.FilterUseCases')}
                    testId="integrations-csv-export-filter-use-case"
                  />
                ),
              },
              license_type: {
                fieldType: ({ field }) => (
                  <IntegrationsCsvExportFilterField
                    field={field}
                    options={licenseTypeOptions}
                    label={t(
                      'Service.OpenctiIntegrations.Filter.LicenseType.Label'
                    )}
                    placeholder={t(
                      'Service.OpenctiIntegrations.Filter.LicenseType.Placeholder'
                    )}
                    testId="integrations-csv-export-filter-license-type"
                  />
                ),
              },
              solution_category: {
                fieldType: ({ field }) => (
                  <IntegrationsCsvExportFilterField
                    field={field}
                    options={solutionCategoryOptions}
                    label={t(
                      'Service.OpenctiIntegrations.Filter.SolutionCategory.Label'
                    )}
                    placeholder={t(
                      'Service.OpenctiIntegrations.Filter.SolutionCategory.Placeholder'
                    )}
                    testId="integrations-csv-export-filter-solution-category"
                  />
                ),
              },
              verified: {
                fieldType: ({ field }) => (
                  <IntegrationsCsvExportFilterField
                    field={field}
                    options={verifiedOptions}
                    label={t(
                      'Service.OpenctiIntegrations.Filter.Verified.Label'
                    )}
                    placeholder={t(
                      'Service.OpenctiIntegrations.Filter.Verified.Placeholder'
                    )}
                    testId="integrations-csv-export-filter-verified"
                  />
                ),
              },
              manager_supported: {
                fieldType: ({ field }) => (
                  <IntegrationsCsvExportFilterField
                    field={field}
                    options={deployableOptions}
                    label={t(
                      'Service.OpenctiIntegrations.Filter.ManagerSupported.Label'
                    )}
                    placeholder={t(
                      'Service.OpenctiIntegrations.Filter.ManagerSupported.Placeholder'
                    )}
                    testId="integrations-csv-export-filter-deployable"
                  />
                ),
              },
            }}>
            <DialogFooter>
              <Button
                type="button"
                priority="tertiary"
                disabled={isExporting}
                onClick={resetAndClose}>
                {t('Utils.Cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isExporting}>
                {t('Service.CsvExport.ExportButton')}
              </Button>
            </DialogFooter>
          </AutoForm>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};

export default IntegrationsCsvExportDialog;
