import { AutocompleteInput } from '@/components/ui/AutocompleteInput';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

describe('AutocompleteInput', () => {
  const options = [
    { label: 'Filigran announcements', value: 'https://slack.test/filigran' },
    { label: 'XTM Hub', value: 'https://slack.test/xtmhub' },
  ];

  const renderInput = (value = '', onChange = vi.fn()) => {
    testRender(
      <AutocompleteInput
        options={options}
        value={value}
        onChange={onChange}
        placeholder="Slack link"
      />
    );

    return { onChange, input: screen.getByRole('combobox') };
  };

  it('forwards the props given by the form control to the input', () => {
    // Given
    const onChange = vi.fn();

    // When
    testRender(
      <>
        <label htmlFor="slack-link-field">Slack link</label>
        <AutocompleteInput
          id="slack-link-field"
          options={options}
          value=""
          onChange={onChange}
        />
      </>
    );

    // Then
    expect(
      screen.getByRole('combobox', { name: 'Slack link' })
    ).toBeInTheDocument();
  });

  it('shows every option when the field is clicked', async () => {
    // Given
    const { input } = renderInput();

    // When
    await userEvent.click(input);

    // Then
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(
      screen.getByRole('option', { name: /Filigran announcements/ })
    ).toHaveTextContent('https://slack.test/filigran');
  });

  it('keeps only the options matching what is typed', async () => {
    // Given
    const { input } = renderInput('xtmhub');

    // When
    await userEvent.click(input);

    // Then
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option', { name: /XTM Hub/ })).toBeInTheDocument();
  });

  it('reports the option value when an option is picked', async () => {
    // Given
    const { input, onChange } = renderInput();

    // When
    await userEvent.click(input);
    await userEvent.click(screen.getByRole('option', { name: /XTM Hub/ }));

    // Then
    expect(onChange).toHaveBeenCalledWith('https://slack.test/xtmhub');
  });

  it('reports what the user types when no option is picked', async () => {
    // Given
    const { input, onChange } = renderInput();

    // When
    await userEvent.type(input, 'h');

    // Then
    expect(onChange).toHaveBeenCalledWith('h');
  });

  it('closes the option list on escape', async () => {
    // Given
    const { input } = renderInput();

    // When
    await userEvent.click(input);
    await userEvent.keyboard('{Escape}');

    // Then
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('picks the highlighted option with the keyboard', async () => {
    // Given
    const { input, onChange } = renderInput();

    // When
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    // Then
    expect(onChange).toHaveBeenCalledWith('https://slack.test/xtmhub');
  });

  it('highlights the last option when navigating up from the top', async () => {
    // Given
    const { input, onChange } = renderInput();

    // When
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowUp}{Enter}');

    // Then
    expect(onChange).toHaveBeenCalledWith('https://slack.test/xtmhub');
  });

  it('wraps around when navigating past the last option', async () => {
    // Given
    const { input, onChange } = renderInput();

    // When
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}');

    // Then
    expect(onChange).toHaveBeenCalledWith('https://slack.test/filigran');
  });
});
