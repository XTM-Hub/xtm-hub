import testRender from '@/utils/test/test-render';
import { Form, FormField } from '@filigran/ui';
import { fireEvent, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import {
  coverageValuesSchema,
  hasCoverageValues,
  MAX_COVERAGE_VALUES,
  ServiceFormCoverageConfirmationField,
  ServiceFormCoverageTagsField,
  ServiceFormCoveredObjectTypesField,
  unchangedCoverageKeys,
} from './CoverageFields';

describe('coverageValuesSchema', () => {
  it('should accept up to the backend maximum of values', () => {
    const values = Array.from(
      { length: MAX_COVERAGE_VALUES },
      (_, index) => `Sector ${index}`
    );

    expect(coverageValuesSchema.safeParse(values).success).toBe(true);
    expect(coverageValuesSchema.safeParse(undefined).success).toBe(true);
  });

  it('should reject more values than the backend accepts', () => {
    const values = Array.from(
      { length: MAX_COVERAGE_VALUES + 1 },
      (_, index) => `Sector ${index}`
    );

    expect(coverageValuesSchema.safeParse(values).success).toBe(false);
  });

  it('should reject a value longer than 128 characters', () => {
    expect(coverageValuesSchema.safeParse(['a'.repeat(128)]).success).toBe(
      true
    );
    expect(coverageValuesSchema.safeParse(['a'.repeat(129)]).success).toBe(
      false
    );
  });
});

type FormValues = { covered_sectors?: string[] };

const TestForm = ({ onChange }: { onChange: (values: string[]) => void }) => {
  const form = useForm<FormValues>({ defaultValues: { covered_sectors: [] } });
  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="covered_sectors"
        render={({ field }) => (
          <ServiceFormCoverageTagsField
            family="sectors"
            field={{
              ...field,
              onChange: (values: string[]) => {
                field.onChange(values);
                onChange(values);
              },
            }}
          />
        )}
      />
    </Form>
  );
};

describe('ServiceFormCoverageTagsField', () => {
  it('should keep a comma inside a sector value and add the tag on Enter', () => {
    const onChange = vi.fn();
    testRender(<TestForm onChange={onChange} />);

    const input = screen.getByPlaceholderText(
      'Service.Form.CoveredSectorsPlaceholder'
    );
    fireEvent.change(input, { target: { value: 'Retail, consumer goods' } });
    fireEvent.keyDown(input, { key: ',' });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(['Retail, consumer goods']);
  });

  it('should not add a value differing from an existing one only by case or spacing', () => {
    const onChange = vi.fn();
    testRender(<TestForm onChange={onChange} />);

    const input = screen.getByPlaceholderText(
      'Service.Form.CoveredSectorsPlaceholder'
    );
    fireEvent.change(input, { target: { value: 'Consumer goods' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.change(input, { target: { value: ' consumer   GOODS ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(['Consumer goods']);
  });

  it('should describe the tag input with the coverage limit', () => {
    testRender(<TestForm onChange={vi.fn()} />);

    const input = screen.getByPlaceholderText(
      'Service.Form.CoveredSectorsPlaceholder'
    );
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      'Service.Form.CoverageLimit'
    );
  });

  it('should show the values of a form reset and edit from them', () => {
    const onChange = vi.fn();
    testRender(<ResettableForm onChange={onChange} />);

    const input = screen.getByPlaceholderText(
      'Service.Form.CoveredSectorsPlaceholder'
    );
    fireEvent.change(input, { target: { value: 'Retail' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('Retail')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByText('Energy')).toBeInTheDocument();
    expect(screen.queryByText('Retail')).toBeNull();

    fireEvent.change(input, { target: { value: 'Finance' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(['Energy', 'Finance']);
  });
});

const ResettableForm = ({
  onChange,
}: {
  onChange: (values: string[]) => void;
}) => {
  const form = useForm<FormValues>({ defaultValues: { covered_sectors: [] } });
  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="covered_sectors"
        render={({ field }) => (
          <ServiceFormCoverageTagsField
            family="sectors"
            field={{
              ...field,
              onChange: (values: string[]) => {
                field.onChange(values);
                onChange(values);
              },
            }}
          />
        )}
      />
      <button
        type="button"
        onClick={() => form.reset({ covered_sectors: ['Energy'] })}>
        Reset
      </button>
    </Form>
  );
};

vi.mock('@/components/service/form/UseCoverageObjectTypes', () => ({
  useCoverageObjectTypes: () => [{ id: 'Malware', name: 'Malware' }],
}));

const ObjectTypesForm = ({
  inferred,
  inferredEmpty = false,
}: {
  inferred: boolean;
  inferredEmpty?: boolean;
}) => {
  const form = useForm<{ covered_object_types?: string[] }>({
    defaultValues: { covered_object_types: ['Malware'] },
  });
  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="covered_object_types"
        render={({ field }) => (
          <ServiceFormCoveredObjectTypesField
            field={field}
            inferred={inferred}
            inferredEmpty={inferredEmpty}
          />
        )}
      />
    </Form>
  );
};

describe('unchangedCoverageKeys', () => {
  const opened = {
    covered_object_types: ['Malware', 'Indicator'],
    covered_sectors: ['Finance'],
    covered_regions: [],
  };

  it('should leave out of an update every list unchanged since the form opened, in any order', () => {
    expect(
      unchangedCoverageKeys(
        {
          covered_object_types: ['Indicator', 'Malware'],
          covered_sectors: ['finance'],
          covered_regions: [],
          coverage_confirmed: false,
        },
        opened
      )
    ).toEqual(['covered_object_types', 'covered_sectors', 'covered_regions']);
  });

  it('should send a list the administrator changed', () => {
    expect(
      unchangedCoverageKeys(
        { ...opened, covered_sectors: ['Finance', 'Energy'] },
        opened
      )
    ).toEqual(['covered_object_types', 'covered_regions']);
  });

  it('should send every list of a confirmed coverage', () => {
    expect(
      unchangedCoverageKeys({ ...opened, coverage_confirmed: true }, opened)
    ).toEqual([]);
  });
});

describe('hasCoverageValues', () => {
  it('should tell whether an integration carries a coverage value', () => {
    expect(hasCoverageValues({ covered_object_types: ['Malware'] })).toBe(true);
    expect(
      hasCoverageValues({
        covered_object_types: [],
        covered_regions: ['europe'],
      })
    ).toBe(true);
    expect(
      hasCoverageValues({
        covered_object_types: [],
        covered_sectors: [],
        covered_regions: null,
      })
    ).toBe(false);
    expect(hasCoverageValues({ name: 'No coverage fields' })).toBe(false);
    expect(hasCoverageValues(undefined)).toBe(false);
  });
});

describe('ServiceFormCoveredObjectTypesField', () => {
  it('should invite to edit an inferred coverage to confirm or correct it', () => {
    testRender(<ObjectTypesForm inferred />);

    expect(screen.getByTestId('coverage-inferred-note')).toHaveTextContent(
      'Service.Form.CoverageInferredNote'
    );
  });

  it('should invite to declare a coverage when the inference found nothing', () => {
    testRender(
      <ObjectTypesForm
        inferred
        inferredEmpty
      />
    );

    expect(screen.getByTestId('coverage-inferred-note')).toHaveTextContent(
      'Service.Form.CoverageInferredEmptyNote'
    );
  });

  it('should not show the note for a declared coverage', () => {
    testRender(<ObjectTypesForm inferred={false} />);

    expect(screen.queryByTestId('coverage-inferred-note')).toBeNull();
  });

  it('should describe the control with the inferred note and the coverage guidance', () => {
    const { container } = testRender(<ObjectTypesForm inferred />);

    const control = container.querySelector('[aria-describedby]');
    const descriptions = (control?.getAttribute('aria-describedby') ?? '')
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent ?? '');
    expect(descriptions).toEqual([
      'Service.Form.CoverageInferredNote',
      'Service.Form.CoverageDescription Service.Form.CoverageLimit',
    ]);
  });
});

const ConfirmationForm = ({
  inferred,
  onChange,
}: {
  inferred: boolean;
  onChange: (value: boolean) => void;
}) => {
  const form = useForm<{ coverage_confirmed?: boolean }>({
    defaultValues: { coverage_confirmed: false },
  });
  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="coverage_confirmed"
        render={({ field }) => (
          <ServiceFormCoverageConfirmationField
            field={{
              ...field,
              onChange: (value: boolean) => {
                field.onChange(value);
                onChange(value);
              },
            }}
            inferred={inferred}
          />
        )}
      />
    </Form>
  );
};

describe('ServiceFormCoverageConfirmationField', () => {
  it('should let an administrator confirm an inferred coverage unchanged', () => {
    const onChange = vi.fn();
    testRender(
      <ConfirmationForm
        inferred
        onChange={onChange}
      />
    );

    expect(
      screen.getByText('Service.Form.CoverageConfirmLabel')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('coverage-confirm'));
    expect(onChange).toHaveBeenLastCalledWith(true);
  });

  it('should not offer the confirmation for a declared coverage', () => {
    testRender(
      <ConfirmationForm
        inferred={false}
        onChange={vi.fn()}
      />
    );

    expect(screen.queryByTestId('coverage-confirm')).toBeNull();
  });
});
