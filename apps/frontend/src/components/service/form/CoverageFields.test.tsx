import testRender from '@/utils/test/test-render';
import { Form, FormField } from '@filigran/ui';
import { fireEvent, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import {
  coverageValuesSchema,
  MAX_COVERAGE_VALUES,
  ServiceFormCoverageTagsField,
  ServiceFormCoveredObjectTypesField,
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
});

vi.mock('@/components/service/form/UseCoverageObjectTypes', () => ({
  useCoverageObjectTypes: () => [{ id: 'Malware', name: 'Malware' }],
}));

const ObjectTypesForm = ({ inferred }: { inferred: boolean }) => {
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
          />
        )}
      />
    </Form>
  );
};

describe('ServiceFormCoveredObjectTypesField', () => {
  it('should invite to edit an inferred coverage to confirm or correct it', () => {
    testRender(<ObjectTypesForm inferred />);

    expect(screen.getByTestId('coverage-inferred-note')).toHaveTextContent(
      'Service.Form.CoverageInferredNote'
    );
  });

  it('should not show the note for a declared coverage', () => {
    testRender(<ObjectTypesForm inferred={false} />);

    expect(screen.queryByTestId('coverage-inferred-note')).toBeNull();
  });
});
