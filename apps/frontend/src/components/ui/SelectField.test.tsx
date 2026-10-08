import { SelectField } from '@/components/ui/SelectField';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const LABEL = 'Region';
const PLACEHOLDER = 'Pick a region';
const ERROR_MESSAGE = 'Region is required';
const OPTIONS = [
  { value: 'eu', label: 'Europe' },
  { value: 'us', label: 'United States' },
];

describe('SelectField', () => {
  it('should name the combobox with its label and mark it required when required is set', () => {
    // Given / When
    testRender(
      <SelectField
        label={LABEL}
        required
        options={OPTIONS}
        value={undefined}
        onValueChange={vi.fn()}
      />
    );

    // Then
    expect(screen.getByRole('combobox', { name: LABEL })).toBeInTheDocument();
    expect(screen.getByText(LABEL)).toHaveTextContent(`${LABEL}*`);
  });

  it('should show no required marker when required is not set', () => {
    // Given / When
    testRender(
      <SelectField
        label={LABEL}
        options={OPTIONS}
        value={undefined}
        onValueChange={vi.fn()}
      />
    );

    // Then
    expect(screen.getByText(LABEL)).toHaveTextContent(new RegExp(`^${LABEL}$`));
  });

  it('should show the placeholder when no value is selected', () => {
    // Given / When
    testRender(
      <SelectField
        label={LABEL}
        placeholder={PLACEHOLDER}
        options={OPTIONS}
        value={undefined}
        onValueChange={vi.fn()}
      />
    );

    // Then
    expect(screen.getByRole('combobox', { name: LABEL })).toHaveTextContent(
      PLACEHOLDER
    );
  });

  it('should list every option when the select is opened', async () => {
    // Given
    const { user } = testRender(
      <SelectField
        label={LABEL}
        options={OPTIONS}
        value={undefined}
        onValueChange={vi.fn()}
      />
    );

    // When
    await user.click(screen.getByRole('combobox', { name: LABEL }));

    // Then
    expect(
      screen.getAllByRole('option').map((option) => option.textContent)
    ).toEqual(OPTIONS.map((option) => option.label));
  });

  it('should hand the picked value to onValueChange when an option is selected', async () => {
    // Given
    const onValueChange = vi.fn();
    const { user } = testRender(
      <SelectField
        label={LABEL}
        options={OPTIONS}
        value={undefined}
        onValueChange={onValueChange}
      />
    );

    // When
    await user.click(screen.getByRole('combobox', { name: LABEL }));
    await user.click(screen.getByRole('option', { name: 'United States' }));

    // Then
    expect(onValueChange).toHaveBeenCalledWith('us');
  });

  it('should describe the combobox with the error message when an error is given', () => {
    // Given / When
    testRender(
      <SelectField
        label={LABEL}
        options={OPTIONS}
        value={undefined}
        onValueChange={vi.fn()}
        error={ERROR_MESSAGE}
      />
    );

    // Then
    expect(screen.getByText(ERROR_MESSAGE)).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: LABEL })
    ).toHaveAccessibleDescription(ERROR_MESSAGE);
  });

  it('should show no helper text and no description when no error is given', () => {
    // Given / When
    testRender(
      <SelectField
        label={LABEL}
        options={OPTIONS}
        value={undefined}
        onValueChange={vi.fn()}
      />
    );

    // Then
    expect(screen.queryByText(ERROR_MESSAGE)).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: LABEL })).not.toHaveAttribute(
      'aria-describedby'
    );
  });

  it('should not open the list when the field is disabled', async () => {
    // Given
    const { user } = testRender(
      <SelectField
        label={LABEL}
        options={OPTIONS}
        value={undefined}
        onValueChange={vi.fn()}
        disabled
      />
    );

    // When
    await user.click(screen.getByRole('combobox', { name: LABEL }));

    // Then
    expect(screen.getByRole('combobox', { name: LABEL })).toBeDisabled();
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });
});
