import { TranslatableEnumSelectField } from '@/components/ui/TranslatableEnumSelectField';
import { Form } from '@filigran/ui';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

const LABEL = 'Category';
const PLACEHOLDER = 'Pick one';
const NAMESPACE = 'MyNamespace';
const FIRST_VALUE = 'first_value';
const SECOND_VALUE = 'second_value';
const ERROR_MESSAGE = 'Category is required';

interface FormValues {
  category: string;
}

const FakeForm = ({
  onChange = vi.fn(),
  error,
}: {
  onChange?: (value: string) => void;
  error?: string;
}) => {
  const form = useForm<FormValues>({ defaultValues: { category: '' } });
  const field = form.register('category');

  return (
    <Form {...form}>
      <TranslatableEnumSelectField
        field={{
          ...field,
          value: form.watch('category'),
          onChange: (value: string) => {
            form.setValue('category', value);
            onChange(value);
          },
        }}
        label={LABEL}
        placeholder={PLACEHOLDER}
        values={[FIRST_VALUE, SECOND_VALUE]}
        translationNamespace={NAMESPACE}
        error={error}
      />
    </Form>
  );
};

describe('TranslatableEnumSelectField', () => {
  it('should name the combobox with its required label when rendered', () => {
    // Given / When
    render(<FakeForm />);

    // Then
    expect(screen.getByRole('combobox', { name: LABEL })).toBeInTheDocument();
    expect(screen.getByText(LABEL)).toHaveTextContent(`${LABEL}*`);
  });

  it('should list every translated value as an option when the select is opened', async () => {
    // Given
    const user = userEvent.setup();
    render(<FakeForm />);

    // When
    await user.click(screen.getByRole('combobox', { name: LABEL }));

    // Then
    expect(
      screen.getAllByRole('option').map((option) => option.textContent)
    ).toEqual([`${NAMESPACE}.${FIRST_VALUE}`, `${NAMESPACE}.${SECOND_VALUE}`]);
  });

  it('should describe the combobox with the error message when an error is given', () => {
    // Given / When
    render(<FakeForm error={ERROR_MESSAGE} />);

    // Then
    expect(
      screen.getByRole('combobox', { name: LABEL })
    ).toHaveAccessibleDescription(ERROR_MESSAGE);
  });

  it('should show no helper text when no error is given', () => {
    // Given / When
    render(<FakeForm />);

    // Then
    expect(screen.queryByText(ERROR_MESSAGE)).not.toBeInTheDocument();
  });

  it('should forward the picked value to field.onChange when an option is selected', async () => {
    // Given
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<FakeForm onChange={onChange} />);

    // When
    await user.click(screen.getByRole('combobox', { name: LABEL }));
    await user.click(
      screen.getByRole('option', { name: `${NAMESPACE}.${SECOND_VALUE}` })
    );

    // Then
    expect(onChange).toHaveBeenCalledWith(SECOND_VALUE);
  });
});
