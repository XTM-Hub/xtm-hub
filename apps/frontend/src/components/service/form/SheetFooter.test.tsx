import { AppServiceContext } from '@/components/service/components/ServiceContext';
import {
  buildServiceContext,
  REQUEST_VALIDATION_LABEL,
  VALIDATE_LABEL,
} from '@/components/service/form/ServiceForm.test-utils';
import { ServiceFormSheetFooter } from '@/components/service/form/SheetFooter';
import {
  SheetWithPreventingDialog,
  useDialogContext,
} from '@/components/ui/SheetWithPreventingDialog';
import testRender from '@/utils/test/test-render';
import { DocumentStatus } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

const SAVE_AS_DRAFT_LABEL = 'Service.Form.SaveAsDraft';
const SAVE_LABEL = 'Service.Form.Save';
const PUBLISH_LABEL = 'Service.Form.Publish';
const FILE_FIELD_LABEL = 'Add a file';
const NAME_FIELD_LABEL = 'Name';
const CLOSE_LABEL = 'Utils.Close';
const PREVENT_TITLE = 'DialogActions.PreventSheetTitle';

interface FooterOptions {
  status?: DocumentStatus;
  // Preloaded form values, as an edited resource provides them
  values?: { name: string };
  isSubmitting?: boolean;
}

// Stands for a file field, which raises the sheet's dirty flag on its own
const FileFieldStub = () => {
  const { setUploadsDirty } = useDialogContext();
  return (
    <button
      type="button"
      onClick={() => setUploadsDirty(true)}>
      {FILE_FIELD_LABEL}
    </button>
  );
};

const FooterInForm = ({ status: footerStatus, values }: FooterOptions) => {
  const form = useForm<{ status?: DocumentStatus; name: string }>({
    defaultValues: { name: '' },
    values,
  });
  const status = useWatch({ control: form.control, name: 'status' });
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(() => undefined)}>
        <FileFieldStub />
        <input
          aria-label={NAME_FIELD_LABEL}
          {...form.register('name')}
        />
        <ServiceFormSheetFooter status={footerStatus} />
        <output>{status}</output>
      </form>
    </FormProvider>
  );
};

const buildFooter = (options: FooterOptions = {}) => (
  <AppServiceContext
    {...buildServiceContext({ isSubmitting: options.isSubmitting ?? false })}>
    <SheetWithPreventingDialog
      open
      setOpen={vi.fn()}
      title="Service form">
      <FooterInForm {...options} />
    </SheetWithPreventingDialog>
  </AppServiceContext>
);

const renderFooter = (options: FooterOptions = {}) => {
  const view = testRender(buildFooter(options));
  return {
    ...view,
    rerenderFooter: (next: FooterOptions) => view.rerender(buildFooter(next)),
  };
};

// The close cross of the sheet has no text
const buttonLabels = () =>
  screen
    .getAllByRole('button')
    .map((button) => button.textContent)
    .filter((label) => label && label !== FILE_FIELD_LABEL);

describe('ServiceFormSheetFooter', () => {
  it.each([
    [
      'a new resource',
      undefined,
      [SAVE_AS_DRAFT_LABEL, REQUEST_VALIDATION_LABEL],
    ],
    [
      'a draft',
      DocumentStatus.Draft,
      [SAVE_AS_DRAFT_LABEL, REQUEST_VALIDATION_LABEL],
    ],
    [
      'a resource in validation',
      DocumentStatus.InValidation,
      [SAVE_LABEL, PUBLISH_LABEL],
    ],
    ['a published resource', DocumentStatus.Published, [VALIDATE_LABEL]],
  ])(
    'should offer the matching actions when the footer is for %s',
    (_resource, status, expectedLabels) => {
      // Given a resource with a status

      // When the footer renders
      renderFooter({ status });

      // Then only the actions of that status are offered
      expect(buttonLabels()).toEqual(expectedLabels);
    }
  );

  it.each([
    [undefined, SAVE_AS_DRAFT_LABEL, DocumentStatus.Draft],
    [undefined, REQUEST_VALIDATION_LABEL, DocumentStatus.InValidation],
    [DocumentStatus.Draft, SAVE_AS_DRAFT_LABEL, DocumentStatus.Draft],
    [
      DocumentStatus.Draft,
      REQUEST_VALIDATION_LABEL,
      DocumentStatus.InValidation,
    ],
    [DocumentStatus.InValidation, SAVE_LABEL, DocumentStatus.InValidation],
    [DocumentStatus.InValidation, PUBLISH_LABEL, DocumentStatus.Published],
    [DocumentStatus.Published, VALIDATE_LABEL, DocumentStatus.Published],
  ])(
    'should set the form status when the user clicks %s on a resource with status %s',
    async (status, label, expectedStatus) => {
      // Given
      const { user } = renderFooter({ status });

      // When
      await user.click(screen.getByRole('button', { name: label }));

      // Then
      expect(screen.getByRole('status')).toHaveTextContent(expectedStatus);
    }
  );

  it('should disable the submit buttons while the service mutation is in flight', () => {
    // Given a service context with a mutation in flight
    renderFooter({ status: DocumentStatus.Draft, isSubmitting: true });

    // Then the form cannot be submitted again
    expect(
      screen.getByRole('button', { name: SAVE_AS_DRAFT_LABEL })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', {
        name: new RegExp(`^${REQUEST_VALIDATION_LABEL}`),
      })
    ).toBeDisabled();
  });

  it('should keep the submit buttons enabled when no service mutation is in flight', () => {
    // Given a service context without a mutation in flight
    renderFooter({ status: DocumentStatus.Published });

    // Then the form can be submitted
    expect(screen.getByRole('button', { name: VALIDATE_LABEL })).toBeEnabled();
  });

  it.each([
    [
      'a draft',
      DocumentStatus.Draft,
      SAVE_AS_DRAFT_LABEL,
      REQUEST_VALIDATION_LABEL,
    ],
    [
      'a resource in validation',
      DocumentStatus.InValidation,
      SAVE_LABEL,
      PUBLISH_LABEL,
    ],
  ])(
    'should show the busy state only on the clicked button when the user submits %s',
    async (_resource, status, secondaryLabel, primaryLabel) => {
      // Given
      const { user, rerenderFooter } = renderFooter({ status });
      await user.click(screen.getByRole('button', { name: secondaryLabel }));

      // When the mutation starts
      rerenderFooter({ status, isSubmitting: true });

      // Then only the clicked button is busy, and the other one cannot be used
      expect(
        screen.getByRole('button', { name: new RegExp(`^${secondaryLabel}`) })
      ).toHaveAttribute('aria-busy', 'true');
      expect(
        screen.getByRole('button', { name: primaryLabel })
      ).not.toHaveAttribute('aria-busy');
      expect(screen.getByRole('button', { name: primaryLabel })).toBeDisabled();
    }
  );

  it('should close without asking when the user closes an untouched form', async () => {
    // Given an edited resource whose values are preloaded and not touched
    const { user } = renderFooter({
      status: DocumentStatus.Published,
      values: { name: 'Existing resource' },
    });

    // When
    await user.click(screen.getByRole('button', { name: CLOSE_LABEL }));

    // Then
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('should ask before closing when the user edited a field', async () => {
    // Given
    const { user } = renderFooter({
      status: DocumentStatus.Published,
      values: { name: 'Existing resource' },
    });
    await user.type(
      screen.getByRole('textbox', { name: NAME_FIELD_LABEL }),
      '!'
    );

    // When
    await user.click(screen.getByRole('button', { name: CLOSE_LABEL }));

    // Then
    expect(
      await screen.findByRole('alertdialog', { name: PREVENT_TITLE })
    ).toBeInTheDocument();
  });

  it('should close without asking when the user reverts an edit', async () => {
    // Given a field edited then restored to its original value
    const { user } = renderFooter({ status: DocumentStatus.Draft });
    const nameField = screen.getByRole('textbox', { name: NAME_FIELD_LABEL });
    await user.type(nameField, 'a');
    await user.clear(nameField);

    // When
    await user.click(screen.getByRole('button', { name: CLOSE_LABEL }));

    // Then
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('should keep asking before closing when the form goes back to clean after a file field made it dirty', async () => {
    // Given a sheet made dirty by a file field, and a field edited then reverted
    const { user } = renderFooter({ status: undefined });
    await user.click(screen.getByRole('button', { name: FILE_FIELD_LABEL }));
    const nameField = screen.getByRole('textbox', { name: NAME_FIELD_LABEL });
    await user.type(nameField, 'a');

    // When the user reverts the edit and the form is clean again
    await user.clear(nameField);
    await user.click(screen.getByRole('button', { name: CLOSE_LABEL }));

    // Then
    expect(
      await screen.findByRole('alertdialog', { name: PREVENT_TITLE })
    ).toBeInTheDocument();
  });
});
