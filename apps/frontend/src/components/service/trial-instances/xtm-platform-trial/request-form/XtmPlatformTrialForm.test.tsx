import {
  REGIONS_VALUES,
  USE_CASES_BY_PLATFORM_IDENTIFIER,
} from '@/components/service/trial-instances/form-constants';
import {
  XtmPlatformTrialForm,
  xtmPlatformTrialFormSchema,
} from '@/components/service/trial-instances/xtm-platform-trial/request-form/XtmPlatformTrialForm';
import testRender from '@/utils/test/test-render';
import { PlatformIdentifier } from '@graphql/generated';
import { screen, waitFor, within } from '@testing-library/react';
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
  use_cases_by_product: [
    { platform_identifier: PlatformIdentifier.Opencti },
    { platform_identifier: PlatformIdentifier.Openaev },
  ],
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
  it('does not let the user pick the products of the trial', () => {
    testRender(<XtmPlatformTrialForm handleSubmit={vi.fn()} />);

    expect(
      screen.queryByRole('checkbox', { name: /PlatformIdentifier\./ })
    ).not.toBeInTheDocument();
  });

  it('renders one use case field for OpenCTI then one for OpenAEV', () => {
    testRender(<XtmPlatformTrialForm handleSubmit={vi.fn()} />);

    // Region, job title, activity sector, then the OpenCTI and OpenAEV use cases
    const useCaseSelects = screen.getAllByRole('combobox').slice(3);
    expect(
      useCaseSelects.map((select) =>
        within(select)
          .getAllByRole('option')
          .map((option) => option.getAttribute('value'))
      )
    ).toEqual([
      USE_CASES_BY_PLATFORM_IDENTIFIER[PlatformIdentifier.Opencti],
      USE_CASES_BY_PLATFORM_IDENTIFIER[PlatformIdentifier.Openaev],
    ]);
  });

  it('submits the expected values when the form is filled and submitted', async () => {
    const handleSubmit = vi.fn();
    const { user, container } = testRender(
      <XtmPlatformTrialForm handleSubmit={handleSubmit} />
    );

    const selects = screen.getAllByRole('combobox');
    // Region, job title, activity sector, then the OpenCTI and OpenAEV use cases.
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
    expect(submittedValues).not.toHaveProperty('products');
    expect(
      submittedValues.use_cases_by_product.map(
        (entry) => entry.platform_identifier
      )
    ).toEqual([PlatformIdentifier.Opencti, PlatformIdentifier.Openaev]);
    for (const entry of submittedValues.use_cases_by_product) {
      expect(entry.use_case).toBeDefined();
    }
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

  // Each field path comes with the position of its select: region, job title,
  // activity sector, then the OpenCTI and OpenAEV use cases.
  it.each<[string, number]>([
    ['region', 0],
    ['job_title', 1],
    ['activity_sector', 2],
    ['use_cases_by_product.0.use_case', 3],
    ['use_cases_by_product.1.use_case', 4],
  ])(
    'should show the %s validation message when the form is submitted with the selects empty',
    async (fieldPath, selectIndex) => {
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
      // Both use case selects show the same message: only look inside the
      // container of the field under test, which also holds its error.
      const fieldContainer = screen
        .getAllByRole('combobox')
        [selectIndex]?.closest('div') as HTMLElement;
      expect(
        await within(fieldContainer).findByText(expectedMessage)
      ).toBeInTheDocument();
    }
  );
});
