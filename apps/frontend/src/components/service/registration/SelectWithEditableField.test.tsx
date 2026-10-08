import testRender from '@/utils/test/test-render';
import { fireEvent, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SelectWithEditableField } from './SelectWithEditableField';

const FIELD_LABEL = 'Cancellation reason';
const PLACEHOLDER_TEXT = 'Select a reason';
const OTHER_LABEL = 'Other';
const OTHER_INPUT_PLACEHOLDER = 'Type your reason';
const OTHER_VALUE_PREFIX = `${OTHER_LABEL}:`;
const COMPLEXITY_VALUE = 'complexity';
const COMPLEXITY_LABEL = 'Configuration is too complex to complete';
const EXPERTISE_VALUE = 'expertise';
const EXPERTISE_LABEL = 'We lack internal expertise';
const OTHER_WITH_TEXT_VALUE = `${OTHER_VALUE_PREFIX} custom text`;

vi.mock('@filigran/design-system', async () => {
  const React = await import('react');
  const actual = await vi.importActual<
    typeof import('@filigran/design-system')
  >('@filigran/design-system');

  const SelectContext = React.createContext<{
    value: string;
    onValueChange: (value: string) => void;
    open: boolean;
    close: () => void;
    toggleRef: React.RefObject<HTMLButtonElement | null>;
  } | null>(null);

  return {
    ...actual,
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value: string;
      onValueChange: (value: string) => void;
      children: ReactNode;
    }) => {
      const [open, setOpen] = React.useState(false);
      const toggleRef = React.useRef<HTMLButtonElement>(null);
      return (
        <div
          data-testid="select-root"
          data-value={value}>
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen(!open)}>
            toggle-options
          </button>
          <SelectContext.Provider
            value={{
              value,
              onValueChange,
              open,
              close: () => setOpen(false),
              toggleRef,
            }}>
            {children}
          </SelectContext.Provider>
        </div>
      );
    },
    SelectTrigger: ({ children }: { children: ReactNode }) => (
      <div data-testid="select-trigger">{children}</div>
    ),
    // The real SelectValue needs the Radix Select root, which this mock replaces.
    SelectValue: ({
      placeholder,
      children,
    }: {
      placeholder: string;
      children: ReactNode;
    }) => <>{children || placeholder}</>,
    // Like Radix, closing the list sends focus back to the trigger unless
    // onCloseAutoFocus prevents it.
    SelectContent: ({
      children,
      onCloseAutoFocus,
    }: {
      children: ReactNode;
      onCloseAutoFocus?: (event: Event) => void;
    }) => {
      const context = React.useContext(SelectContext);
      const open = Boolean(context?.open);
      const wasOpenRef = React.useRef(open);
      React.useEffect(() => {
        if (wasOpenRef.current && !open) {
          const event = new Event('closeAutoFocus', { cancelable: true });
          onCloseAutoFocus?.(event);
          if (!event.defaultPrevented) {
            context?.toggleRef.current?.focus();
          }
        }
        wasOpenRef.current = open;
      }, [open, onCloseAutoFocus, context]);
      if (!open) {
        return null;
      }
      return <div role="listbox">{children}</div>;
    },
    SelectItem: ({
      value,
      children,
    }: {
      value: string;
      children: ReactNode;
    }) => {
      const context = React.useContext(SelectContext);
      return (
        <button
          type="button"
          role="option"
          aria-selected={context?.value === value}
          onClick={() => {
            context?.onValueChange(value);
            context?.close();
          }}>
          {children}
        </button>
      );
    },
  };
});

const options = [
  { value: COMPLEXITY_VALUE, label: COMPLEXITY_LABEL },
  { value: EXPERTISE_VALUE, label: EXPERTISE_LABEL },
];

const ControlledHarness = ({
  initialValue,
  onChangeSpy,
}: {
  initialValue: string | undefined;
  onChangeSpy?: (value: string) => void;
}) => {
  const [value, setValue] = useState<string | undefined>(initialValue);

  return (
    <SelectWithEditableField
      value={value}
      onChange={(nextValue) => {
        setValue(nextValue);
        onChangeSpy?.(nextValue);
      }}
      options={options}
      labels={{
        label: FIELD_LABEL,
        placeholder: PLACEHOLDER_TEXT,
        editableFieldLabel: OTHER_LABEL,
        editableFieldPlaceholder: OTHER_INPUT_PLACEHOLDER,
      }}
      editableFieldValue={OTHER_LABEL}
      required
    />
  );
};

const pickOption = (name: string) => {
  fireEvent.click(screen.getByRole('button', { name: 'toggle-options' }));
  fireEvent.click(screen.getByRole('option', { name }));
};

const queryOtherInput = () =>
  screen.queryByRole('textbox', { name: OTHER_INPUT_PLACEHOLDER });

const getOtherInput = () =>
  screen.getByRole('textbox', { name: OTHER_INPUT_PLACEHOLDER });

describe('SelectWithEditableField', () => {
  it('should render the label with the required marker when the field is required', () => {
    // Given / When
    testRender(<ControlledHarness initialValue={undefined} />);

    // Then
    expect(screen.getByText(FIELD_LABEL)).toHaveTextContent(`${FIELD_LABEL}*`);
  });

  it('should display selected option label when controlled value matches an option', () => {
    // Given
    testRender(<ControlledHarness initialValue={COMPLEXITY_VALUE} />);

    // Then
    expect(screen.getByTestId('select-trigger')).toHaveTextContent(
      COMPLEXITY_LABEL
    );
  });

  it('should list Other as the first option', () => {
    // Given
    testRender(<ControlledHarness initialValue={undefined} />);

    // When
    fireEvent.click(screen.getByRole('button', { name: 'toggle-options' }));

    // Then
    expect(
      screen.getAllByRole('option').map((option) => option.textContent)
    ).toEqual([OTHER_LABEL, COMPLEXITY_LABEL, EXPERTISE_LABEL]);
  });

  it('should write the reason value when a reason is picked', () => {
    // Given
    const onChangeSpy = vi.fn();
    testRender(
      <ControlledHarness
        initialValue={undefined}
        onChangeSpy={onChangeSpy}
      />
    );

    // When
    pickOption(COMPLEXITY_LABEL);

    // Then
    expect(onChangeSpy).toHaveBeenLastCalledWith(COMPLEXITY_VALUE);
    expect(screen.getByTestId('select-trigger')).toHaveTextContent(
      COMPLEXITY_LABEL
    );
    expect(queryOtherInput()).not.toBeInTheDocument();
  });

  it('should show a focused input below the closed list when Other is picked', () => {
    // Given
    const onChangeSpy = vi.fn();
    testRender(
      <ControlledHarness
        initialValue={undefined}
        onChangeSpy={onChangeSpy}
      />
    );

    // When
    pickOption(OTHER_LABEL);

    // Then
    expect(onChangeSpy).toHaveBeenLastCalledWith(OTHER_LABEL);
    expect(screen.getByTestId('select-trigger')).toHaveTextContent(OTHER_LABEL);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(queryOtherInput()).toHaveValue('');
    expect(queryOtherInput()).toHaveFocus();
  });

  it('should write the typed text prefixed with the Other value', () => {
    // Given
    const onChangeSpy = vi.fn();
    testRender(
      <ControlledHarness
        initialValue={undefined}
        onChangeSpy={onChangeSpy}
      />
    );
    pickOption(OTHER_LABEL);

    // When
    fireEvent.change(getOtherInput(), {
      target: { value: '  my own reason ' },
    });

    // Then
    expect(onChangeSpy).toHaveBeenLastCalledWith(
      `${OTHER_VALUE_PREFIX} my own reason`
    );
    expect(queryOtherInput()).toHaveValue('  my own reason ');
  });

  it('should write the bare Other value when the typed text is blank', () => {
    // Given
    const onChangeSpy = vi.fn();
    testRender(
      <ControlledHarness
        initialValue={OTHER_WITH_TEXT_VALUE}
        onChangeSpy={onChangeSpy}
      />
    );

    // When
    fireEvent.change(getOtherInput(), { target: { value: '   ' } });

    // Then
    expect(onChangeSpy).toHaveBeenLastCalledWith(OTHER_LABEL);
  });

  it('should hide the input and write the reason when switching back to a reason', () => {
    // Given
    const onChangeSpy = vi.fn();
    testRender(
      <ControlledHarness
        initialValue={OTHER_WITH_TEXT_VALUE}
        onChangeSpy={onChangeSpy}
      />
    );

    // When
    pickOption(EXPERTISE_LABEL);

    // Then
    expect(onChangeSpy).toHaveBeenLastCalledWith(EXPERTISE_VALUE);
    expect(screen.getByTestId('select-trigger')).toHaveTextContent(
      EXPERTISE_LABEL
    );
    expect(queryOtherInput()).not.toBeInTheDocument();
  });

  it('should keep the typed text when Other is picked again', () => {
    // Given
    const onChangeSpy = vi.fn();
    testRender(
      <ControlledHarness
        initialValue={OTHER_WITH_TEXT_VALUE}
        onChangeSpy={onChangeSpy}
      />
    );

    // When
    pickOption(OTHER_LABEL);

    // Then
    expect(onChangeSpy).not.toHaveBeenCalled();
    expect(queryOtherInput()).toHaveValue('custom text');
    expect(queryOtherInput()).toHaveFocus();
  });

  it.each([
    { initialValue: OTHER_WITH_TEXT_VALUE, expectedText: 'custom text' },
    { initialValue: OTHER_LABEL, expectedText: '' },
    { initialValue: 'legacy free text', expectedText: 'legacy free text' },
  ])(
    'should show Other selected with "$expectedText" for the initial value "$initialValue"',
    ({ initialValue, expectedText }) => {
      // Given / When
      testRender(<ControlledHarness initialValue={initialValue} />);

      // Then
      expect(screen.getByTestId('select-trigger')).toHaveTextContent(
        OTHER_LABEL
      );
      expect(queryOtherInput()).toHaveValue(expectedText);
      expect(queryOtherInput()).not.toHaveFocus();
    }
  );

  it('should keep cleared custom value while dropdown is open in controlled mode', () => {
    // Given
    testRender(<ControlledHarness initialValue={OTHER_WITH_TEXT_VALUE} />);
    fireEvent.click(screen.getByRole('button', { name: 'toggle-options' }));
    const customInput = screen.getByPlaceholderText(OTHER_INPUT_PLACEHOLDER);
    expect(customInput).toHaveValue('custom text');

    // When
    fireEvent.change(customInput, { target: { value: '' } });

    // Then
    expect(screen.getByPlaceholderText(OTHER_INPUT_PLACEHOLDER)).toHaveValue(
      ''
    );
  });
});
