import AnalyticsClickCapture from '@/components/analytics/AnalyticsClickCapture';
import { ServiceManageSheet } from '@/components/service/components/ServiceManageSheet';
import { ServiceFormValues } from '@/components/service/components/subscribable-services.types';
import {
  toCreateDocumentInput,
  toUpdateDocumentInput,
} from '@/components/service/document/document-mutation.utils';
import { ServiceFormSheetFooter } from '@/components/service/form/SheetFooter';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { readTrackedEvents, startAnalytics } from '@/utils/test/analytics';
import testRender from '@/utils/test/test-render';
import { DocumentItemFragment, DocumentStatus } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  useServiceCapability: vi.fn(),
  serviceContext: {} as Record<string, unknown>,
}));

vi.mock('@/components/service/components/ServiceContext', () => ({
  useServiceContext: () => testState.serviceContext,
}));

vi.mock('@/hooks/use-service-capability', () => ({
  default: testState.useServiceCapability,
}));

vi.mock('@/utils/actions/revalidate-path.actions', () => ({
  default: vi.fn(),
}));

const PAGE_TYPE = 'Library';
const RESOURCE_UUID = '3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b';
const RESOURCE_NAME = 'Ransomware playbook';
const DOCUMENT = {
  id: btoa(`Document:${RESOURCE_UUID}`),
  name: RESOURCE_NAME,
  status: DocumentStatus.Published,
  type: ShareableResourceType.OPENCTI_PLAYBOOK,
} as DocumentItemFragment;

const SAVE_AS_DRAFT_LABEL = 'Service.Form.SaveAsDraft';
const REQUEST_VALIDATION_LABEL = 'Service.Form.RequestValidation';
const PUBLISH_LABEL = 'Service.Form.Publish';
const NAME_FIELD_LABEL = 'Name';

const StubForm = ({
  document,
  handleSubmit,
}: {
  document?: DocumentItemFragment;
  handleSubmit: (values: ServiceFormValues) => void;
}) => {
  const form = useForm<ServiceFormValues>();
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <input
          aria-label={NAME_FIELD_LABEL}
          {...form.register('name')}
        />
        <ServiceFormSheetFooter status={document?.status} />
      </form>
    </FormProvider>
  );
};

const buildDocument = (status: DocumentStatus) =>
  ({
    id: 'document-1',
    slug: 'document-1',
    name: 'My resource',
    status,
  }) as DocumentItemFragment;

const renderSheet = (document?: DocumentItemFragment) => {
  const handleAddSheet = vi.fn();
  const handleUpdateSheet = vi.fn();
  testState.serviceContext = {
    serviceInstance: { id: 'service-1', slug: 'service' },
    translationKey: 'Service.CsvFeed',
    ServiceForm: StubForm,
    handleAddSheet,
    handleUpdateSheet,
    isSubmitting: false,
  };
  const view = testRender(
    <ServiceManageSheet
      document={document}
      open
      setOpen={vi.fn()}
    />
  );
  return { ...view, handleAddSheet, handleUpdateSheet };
};

describe('ServiceManageSheet', () => {
  beforeEach(() => {
    testState.useServiceCapability.mockReturnValue(true);
  });

  it('should send the resource of the edited document when the sheet opened without a trigger is closed', async () => {
    // Given
    testState.serviceContext = {
      serviceInstance: {},
      translationKey: 'Service.OpenctiPlaybooks',
      ServiceForm: () => null,
      handleAddSheet: vi.fn(),
      handleUpdateSheet: vi.fn(),
      isSubmitting: false,
    };
    startAnalytics();
    const { user } = testRender(
      <>
        <AnalyticsClickCapture pageType={PAGE_TYPE} />
        <ServiceManageSheet
          document={DOCUMENT}
          open
          setOpen={vi.fn()}
        />
      </>
    );

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Close' }));

    // Then
    expect(readTrackedEvents('ui_click')).toEqual([
      expect.objectContaining({
        element_id: 'common_panel_close',
        resource_id: RESOURCE_UUID,
        resource_name: RESOURCE_NAME,
        library: 'Playbooks',
        product: 'OpenCTI',
      }),
    ]);
  });

  it.each([
    [DocumentStatus.Draft, 'DocumentStatus.Draft'],
    [DocumentStatus.InValidation, 'DocumentStatus.InValidation'],
    [DocumentStatus.Published, 'DocumentStatus.Published'],
  ])(
    'should show the %s status badge next to the title when the user edits a resource',
    (status, label) => {
      // When
      renderSheet(buildDocument(status));

      // Then
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  );

  it('should not show any status badge when the user creates a resource', () => {
    // When
    renderSheet();

    // Then
    expect(screen.queryByText(/^DocumentStatus\./)).not.toBeInTheDocument();
  });

  it.each([
    [SAVE_AS_DRAFT_LABEL, DocumentStatus.Draft],
    [REQUEST_VALIDATION_LABEL, DocumentStatus.InValidation],
  ])(
    'should create the resource with the status requested by %s',
    async (label, expectedStatus) => {
      // Given
      const { user, handleAddSheet } = renderSheet();

      // When
      await user.click(screen.getByRole('button', { name: label }));

      // Then
      expect(
        toCreateDocumentInput(handleAddSheet.mock.calls[0][0]).status
      ).toBe(expectedStatus);
    }
  );

  it('should create the resource as a draft when the user presses Enter in a text field', async () => {
    // Given
    const { user, handleAddSheet } = renderSheet();

    // When
    await user.type(
      screen.getByRole('textbox', { name: NAME_FIELD_LABEL }),
      '{Enter}'
    );

    // Then
    expect(toCreateDocumentInput(handleAddSheet.mock.calls[0][0]).status).toBe(
      DocumentStatus.Draft
    );
  });

  it.each([
    [DocumentStatus.InValidation, PUBLISH_LABEL, DocumentStatus.Published],
    [
      DocumentStatus.Draft,
      REQUEST_VALIDATION_LABEL,
      DocumentStatus.InValidation,
    ],
  ])(
    'should update a %s resource with the status requested by %s',
    async (currentStatus, label, expectedStatus) => {
      // Given
      const document = buildDocument(currentStatus);
      const { user, handleUpdateSheet } = renderSheet(document);

      // When
      await user.click(screen.getByRole('button', { name: label }));

      // Then
      const [values] = handleUpdateSheet.mock.calls[0];
      expect(toUpdateDocumentInput(values).status).toBe(expectedStatus);
    }
  );

  it.each([
    DocumentStatus.Draft,
    DocumentStatus.InValidation,
    DocumentStatus.Published,
  ])(
    'should keep the status of a %s resource when the user presses Enter in a text field',
    async (currentStatus) => {
      // Given
      const document = buildDocument(currentStatus);
      const { user, handleUpdateSheet } = renderSheet(document);

      // When
      await user.type(
        screen.getByRole('textbox', { name: NAME_FIELD_LABEL }),
        '{Enter}'
      );

      // Then
      const [values] = handleUpdateSheet.mock.calls[0];
      expect(toUpdateDocumentInput(values).status).toBe(currentStatus);
    }
  );
});
