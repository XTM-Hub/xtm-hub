import { AppCombobox } from '@/components/ui/AppCombobox';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';

const LABEL = 'Country';
const PLACEHOLDER = 'Pick a country';
const ERROR_MESSAGE = 'Country is required';

interface CountryOption {
  id: string;
  name: string;
}

const FRANCE: CountryOption = { id: 'fr', name: 'France' };
const JAPAN: CountryOption = { id: 'jp', name: 'Japan' };
const OPTIONS = [FRANCE, JAPAN];

const getOptionLabel = (option: CountryOption) => option.name;
const isOptionEqualToValue = (a: CountryOption, b: CountryOption) =>
  a.id === b.id;

describe('AppCombobox', () => {
  it('should hand the picked option, typed as a single value, when an option is picked', async () => {
    // Given
    const onValueChange = vi.fn();
    const { user } = testRender(
      <AppCombobox
        label={LABEL}
        options={OPTIONS}
        value={null}
        onValueChange={(value) => {
          expectTypeOf(value).toEqualTypeOf<CountryOption | null>();
          onValueChange(value);
        }}
        getOptionLabel={getOptionLabel}
        isOptionEqualToValue={isOptionEqualToValue}
      />
    );

    // When
    await user.click(screen.getByRole('combobox', { name: LABEL }));
    await user.click(screen.getByRole('option', { name: JAPAN.name }));

    // Then
    expect(onValueChange).toHaveBeenCalledWith(JAPAN);
  });

  it('should hand every selected option, typed as a list, when an option is added', async () => {
    // Given
    const onValueChange = vi.fn();
    const { user } = testRender(
      <AppCombobox
        multiple
        label={LABEL}
        options={OPTIONS}
        value={[FRANCE]}
        onValueChange={(value) => {
          expectTypeOf(value).toEqualTypeOf<CountryOption[]>();
          onValueChange(value);
        }}
        getOptionLabel={getOptionLabel}
        isOptionEqualToValue={isOptionEqualToValue}
      />
    );

    // When
    await user.click(screen.getByRole('combobox', { name: LABEL }));
    await user.click(screen.getByRole('option', { name: JAPAN.name }));

    // Then
    expect(onValueChange).toHaveBeenCalledWith([FRANCE, JAPAN]);
  });

  it('should show the selected options as chips when the field is multiple', () => {
    // Given / When
    testRender(
      <AppCombobox
        multiple
        label={LABEL}
        options={OPTIONS}
        value={[FRANCE, JAPAN]}
        onValueChange={vi.fn()}
        getOptionLabel={getOptionLabel}
      />
    );

    // Then
    expect(
      screen.getAllByRole('listitem').map((chip) => chip.textContent)
    ).toEqual([FRANCE.name, JAPAN.name]);
  });

  it('should show the not found message when no option matches the typed text', async () => {
    // Given
    const { user } = testRender(
      <AppCombobox
        label={LABEL}
        options={OPTIONS}
        value={null}
        onValueChange={vi.fn()}
        getOptionLabel={getOptionLabel}
      />
    );

    // When
    await user.type(screen.getByRole('combobox', { name: LABEL }), 'Zzz');

    // Then
    expect(await screen.findByText('Utils.NotFound')).toBeInTheDocument();
  });

  it('should name the field and its list with the label and mark it required when asked', async () => {
    // Given
    const { user } = testRender(
      <AppCombobox
        label={LABEL}
        required
        placeholder={PLACEHOLDER}
        options={OPTIONS}
        value={null}
        onValueChange={vi.fn()}
        getOptionLabel={getOptionLabel}
      />
    );
    const field = screen.getByRole('combobox', { name: LABEL });

    // When
    await user.click(field);

    // Then
    expect(field).toHaveAttribute('placeholder', PLACEHOLDER);
    expect(screen.getByText(LABEL)).toHaveTextContent(`${LABEL}*`);
    expect(screen.getByRole('listbox', { name: LABEL })).toBeInTheDocument();
  });

  it('should name the field with the label without showing it when the label position is none', () => {
    // Given / When
    testRender(
      <AppCombobox
        label={LABEL}
        labelPosition="none"
        options={OPTIONS}
        value={null}
        onValueChange={vi.fn()}
        getOptionLabel={getOptionLabel}
      />
    );

    // Then
    expect(screen.getByRole('combobox', { name: LABEL })).toBeInTheDocument();
    expect(screen.queryByText(LABEL)).not.toBeInTheDocument();
  });

  it('should hand null when the field is cleared', async () => {
    // Given
    const onValueChange = vi.fn();
    const { user } = testRender(
      <AppCombobox
        label={LABEL}
        options={OPTIONS}
        value={FRANCE}
        onValueChange={onValueChange}
        getOptionLabel={getOptionLabel}
        isOptionEqualToValue={isOptionEqualToValue}
      />
    );

    // When
    await user.click(screen.getByRole('button', { name: 'Clear' }));

    // Then
    expect(onValueChange).toHaveBeenCalledWith(null, expect.anything());
  });

  it('should describe the field with the error message and mark it invalid when an error is given', () => {
    // Given / When
    testRender(
      <AppCombobox
        label={LABEL}
        error={ERROR_MESSAGE}
        options={OPTIONS}
        value={null}
        onValueChange={vi.fn()}
        getOptionLabel={getOptionLabel}
      />
    );

    // Then
    const field = screen.getByRole('combobox', { name: LABEL });
    expect(field).toHaveAccessibleDescription(ERROR_MESSAGE);
    expect(field).toBeInvalid();
  });

  it('should show no helper text and keep the field valid when no error is given', () => {
    // Given / When
    testRender(
      <AppCombobox
        label={LABEL}
        options={OPTIONS}
        value={null}
        onValueChange={vi.fn()}
        getOptionLabel={getOptionLabel}
      />
    );

    // Then
    const field = screen.getByRole('combobox', { name: LABEL });
    expect(field).not.toHaveAttribute('aria-describedby');
    expect(field).toBeValid();
  });
});
