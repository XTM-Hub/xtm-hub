import { REGIONS_VALUES } from '@/components/service/trial-instances/form-constants';
import {
  XtmPlatformTrialForm,
  xtmPlatformTrialFormSchema,
} from '@/components/service/trial-instances/xtm-platform-trial/request-form/XtmPlatformTrialForm';
import testRender from '@/utils/test/test-render';
import { PlatformIdentifier } from '@graphql/generated';
import { screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('@filigran/design-system', async () => {
  const React = await import('react');
  const actual = await vi.importActual<
    typeof import('@filigran/design-system')
  >('@filigran/design-system');

  const SelectContext = React.createContext<{
    value: string;
    onValueChange: (nextValue: string) => void;
  } | null>(null);

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
      <SelectContext.Provider value={{ value, onValueChange }}>
        {children}
      </SelectContext.Provider>
    ),
    SelectContent: ({ children }: { children: ReactNode }) => {
      const context = React.useContext(SelectContext);
      return (
        <select
          value={context?.value}
          onChange={(event) => context?.onValueChange(event.target.value)}>
          {children}
        </select>
      );
    },
    SelectItem: ({
      value,
      children,
    }: {
      value: string;
      children: ReactNode;
    }) => <option value={value}>{children}</option>,
    SelectTrigger: () => null,
  };
});

const EMPTY_SELECTS_SUBMISSION = {
  use_cases_by_product: [{ platform_identifier: PlatformIdentifier.Opencti }],
};

const getSchemaErrorMessage = (fieldPath: string) => {
  const message = xtmPlatformTrialFormSchema
    .safeParse(EMPTY_SELECTS_SUBMISSION)
    .error?.issues.find((issue) => issue.path.join('.') === fieldPath)?.message;
  if (!message) {
    throw new Error(`The schema raises no issue at ${fieldPath}`);
  }
  return message;
};

describe('XtmPlatformTrialForm', () => {
  it('renders the products warning', () => {
    testRender(<XtmPlatformTrialForm handleSubmit={vi.fn()} />);

    expect(
      screen.getByText('Service.Trials.XtmPlatform.Page.Form.ProductsWarning')
    ).toBeInTheDocument();
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

    await user.click(openctiCheckbox);

    expect(openctiCheckbox).toBeChecked();
    expect(
      screen.getAllByText('Service.Trials.XtmPlatform.Page.Form.UseCaseFor')
    ).toHaveLength(2);
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

  it('marks the terms checkbox invalid when submitted without accepting the terms', async () => {
    const { user } = testRender(
      <XtmPlatformTrialForm handleSubmit={vi.fn()} />
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Service.Trials.XtmPlatform.Page.Form.Submit',
      })
    );

    await waitFor(() =>
      expect(document.getElementById('acceptTerms')).toHaveAttribute(
        'aria-invalid',
        'true'
      )
    );
  });

  it.each([
    'region',
    'job_title',
    'activity_sector',
    'use_cases_by_product.0.use_case',
  ])(
    'should show the %s validation message when the form is submitted with the selects empty',
    async (fieldPath) => {
      // Given
      const expectedMessage = getSchemaErrorMessage(fieldPath);
      const { user } = testRender(
        <XtmPlatformTrialForm handleSubmit={vi.fn()} />
      );

      // When
      await user.click(
        screen.getByRole('button', {
          name: 'Service.Trials.XtmPlatform.Page.Form.Submit',
        })
      );

      // Then
      // Both use case selects show the same message, hence findAll.
      expect(
        (await screen.findAllByText(expectedMessage))[0]
      ).toBeInTheDocument();
    }
  );
});
