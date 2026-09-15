import { REGIONS_VALUES } from '@/components/service/trial-instances/form-constants';
import {
  XtmPlatformTrialForm,
  xtmPlatformTrialFormSchema,
} from '@/components/service/trial-instances/xtm-platform-trial/request-form/XtmPlatformTrialForm';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('@filigran/ui', async () => {
  const actual =
    await vi.importActual<typeof import('@filigran/ui')>('@filigran/ui');

  return {
    ...actual,
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value: string;
      onValueChange: (nextValue: string) => void;
      children: ReactNode;
    }) => (
      <select
        value={value}
        onChange={(event) => onValueChange(event.target.value)}>
        {children}
      </select>
    ),
    SelectContent: ({ children }: { children: ReactNode }) => children,
    SelectItem: ({
      value,
      children,
    }: {
      value: string;
      children: ReactNode;
    }) => <option value={value}>{children}</option>,
    SelectTrigger: ({ children }: { children: ReactNode }) => children,
    SelectValue: () => null,
  };
});

describe('XtmPlatformTrialForm', () => {
  it('renders the products warning by default', () => {
    testRender(<XtmPlatformTrialForm handleSubmit={vi.fn()} />);

    expect(
      screen.getByText('Service.Trials.XtmPlatform.Page.Form.ProductsWarning')
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        'Service.Trials.XtmPlatform.Page.Form.OngoingTrialWarning'
      )
    ).not.toBeInTheDocument();
  });

  it('renders the ongoing trial warning when hasOngoingStandaloneTrials is true', () => {
    testRender(
      <XtmPlatformTrialForm
        handleSubmit={vi.fn()}
        hasOngoingStandaloneTrials
      />
    );

    expect(
      screen.getByText(
        'Service.Trials.XtmPlatform.Page.Form.OngoingTrialWarning'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Service.Trials.XtmPlatform.Page.Form.ProductsWarning')
    ).not.toBeInTheDocument();
  });

  it('renders OpenCTI and OpenAEV checked and XTM One always checked and disabled', () => {
    testRender(<XtmPlatformTrialForm handleSubmit={vi.fn()} />);

    const openctiCheckbox = screen.getByRole('checkbox', {
      name: 'PlatformIdentifier.opencti',
    });
    const openaevCheckbox = screen.getByRole('checkbox', {
      name: 'PlatformIdentifier.openaev',
    });
    const xtmoneCheckbox = screen.getByRole('checkbox', {
      name: 'PlatformIdentifier.xtmone',
    });

    expect(openctiCheckbox).toBeChecked();
    expect(openaevCheckbox).toBeChecked();
    expect(xtmoneCheckbox).toBeChecked();
    expect(xtmoneCheckbox).toBeDisabled();
  });

  it('removes the use case field for a product when it is unchecked and re-adds it when checked again', async () => {
    const { user } = testRender(
      <XtmPlatformTrialForm handleSubmit={vi.fn()} />
    );

    expect(
      screen.getAllByText('Service.Trials.XtmPlatform.Page.Form.UseCaseFor')
    ).toHaveLength(2);

    const openctiCheckbox = screen.getByRole('checkbox', {
      name: 'PlatformIdentifier.opencti',
    });
    await user.click(openctiCheckbox);

    expect(openctiCheckbox).not.toBeChecked();
    expect(
      screen.getAllByText('Service.Trials.XtmPlatform.Page.Form.UseCaseFor')
    ).toHaveLength(1);
  });

  it('disables the submit button when no selectable product is checked', async () => {
    const { user } = testRender(
      <XtmPlatformTrialForm handleSubmit={vi.fn()} />
    );

    await user.click(
      screen.getByRole('checkbox', { name: 'PlatformIdentifier.opencti' })
    );
    await user.click(
      screen.getByRole('checkbox', { name: 'PlatformIdentifier.openaev' })
    );

    expect(
      screen.getByRole('button', {
        name: 'Service.Trials.XtmPlatform.Page.Form.Submit',
      })
    ).toBeDisabled();
  });

  it('keeps the submit button enabled when at least one selectable product is checked', () => {
    testRender(<XtmPlatformTrialForm handleSubmit={vi.fn()} />);

    expect(
      screen.getByRole('button', {
        name: 'Service.Trials.XtmPlatform.Page.Form.Submit',
      })
    ).toBeEnabled();
  });

  it('submits the expected values when the form is filled and submitted', async () => {
    const handleSubmit = vi.fn();
    const { user, container } = testRender(
      <XtmPlatformTrialForm handleSubmit={handleSubmit} />
    );

    const selects = screen.getAllByRole('combobox');
    // Region, job title, activity sector, then one use-case select per selectable product.
    const [
      regionSelect,
      jobTitleSelect,
      activitySectorSelect,
      ...useCaseSelects
    ] = selects;

    await user.selectOptions(regionSelect, REGIONS_VALUES[0]);
    await user.selectOptions(
      jobTitleSelect,
      (jobTitleSelect as HTMLSelectElement).options[1].value
    );
    await user.selectOptions(
      activitySectorSelect,
      (activitySectorSelect as HTMLSelectElement).options[1].value
    );
    for (const select of useCaseSelects) {
      const options = (select as HTMLSelectElement).options;
      await user.selectOptions(select, options[1].value);
    }

    const acceptTermsCheckbox = container.querySelector(
      '#acceptTerms'
    ) as HTMLElement;
    await user.click(acceptTermsCheckbox);

    await user.click(
      screen.getByRole('button', {
        name: 'Service.Trials.XtmPlatform.Page.Form.Submit',
      })
    );

    expect(handleSubmit).toHaveBeenCalled();
    const submittedValues = handleSubmit.mock.calls[0]?.[0] as z.infer<
      typeof xtmPlatformTrialFormSchema
    >;
    expect(submittedValues.acceptTerms).toBe(true);
    expect(submittedValues.region).toBe(REGIONS_VALUES[0]);
  });

  const fillAndSubmitForm = async (
    user: ReturnType<typeof testRender>['user']
  ) => {
    const selects = screen.getAllByRole('combobox');
    const [
      regionSelect,
      jobTitleSelect,
      activitySectorSelect,
      ...useCaseSelects
    ] = selects;

    await user.selectOptions(regionSelect, REGIONS_VALUES[0]);
    await user.selectOptions(
      jobTitleSelect,
      (jobTitleSelect as HTMLSelectElement).options[1].value
    );
    await user.selectOptions(
      activitySectorSelect,
      (activitySectorSelect as HTMLSelectElement).options[1].value
    );
    for (const select of useCaseSelects) {
      const options = (select as HTMLSelectElement).options;
      await user.selectOptions(select, options[1].value);
    }

    await user.click(document.getElementById('acceptTerms') as HTMLElement);

    await user.click(
      screen.getByRole('button', {
        name: 'Service.Trials.XtmPlatform.Page.Form.Submit',
      })
    );
  };

  it('opens the confirmation dialog instead of submitting directly when hasOngoingStandaloneTrials is true', async () => {
    const handleSubmit = vi.fn();
    const { user } = testRender(
      <XtmPlatformTrialForm
        handleSubmit={handleSubmit}
        hasOngoingStandaloneTrials
      />
    );

    await fillAndSubmitForm(user);

    expect(handleSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText('Service.Trials.XtmPlatform.Page.Form.Submit')
    ).toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('closes the confirmation dialog without submitting when Cancel is clicked', async () => {
    const handleSubmit = vi.fn();
    const { user } = testRender(
      <XtmPlatformTrialForm
        handleSubmit={handleSubmit}
        hasOngoingStandaloneTrials
      />
    );

    await fillAndSubmitForm(user);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Utils.Cancel' }));

    expect(handleSubmit).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('submits the pending values and closes the dialog when Confirm is clicked', async () => {
    const handleSubmit = vi.fn();
    const { user } = testRender(
      <XtmPlatformTrialForm
        handleSubmit={handleSubmit}
        hasOngoingStandaloneTrials
      />
    );

    await fillAndSubmitForm(user);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Utils.Confirm' }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    const submittedValues = handleSubmit.mock.calls[0]?.[0] as z.infer<
      typeof xtmPlatformTrialFormSchema
    >;
    expect(submittedValues.acceptTerms).toBe(true);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
