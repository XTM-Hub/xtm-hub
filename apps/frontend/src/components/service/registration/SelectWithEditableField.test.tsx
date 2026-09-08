import testRender from '@/utils/test/test-render';
import { fireEvent, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SelectWithEditableField } from './SelectWithEditableField';

const PLACEHOLDER_TEXT = 'Select a reason';
const OTHER_LABEL = 'Other';
const OTHER_INPUT_PLACEHOLDER = 'Type your reason';
const OTHER_VALUE_PREFIX = `${OTHER_LABEL}:`;
const COMPLEXITY_VALUE = 'complexity';
const COMPLEXITY_LABEL = 'Configuration is too complex to complete';
const OTHER_WITH_TEXT_VALUE = `${OTHER_VALUE_PREFIX} custom text`;

vi.mock('@filigran/ui', async () => {
  const React = await import('react');
  const actual =
    await vi.importActual<typeof import('@filigran/ui')>('@filigran/ui');

  const SelectContext = React.createContext<{
    onValueChange: (value: string) => void;
    open: boolean;
  } | null>(null);

  return {
    ...actual,
    Select: ({
      value,
      onValueChange,
      open,
      onOpenChange,
      children,
    }: {
      value: string;
      onValueChange: (value: string) => void;
      open: boolean;
      onOpenChange: (open: boolean) => void;
      children: ReactNode;
    }) => (
      <div
        data-testid="select-root"
        data-value={value}>
        <button
          type="button"
          onClick={() => onOpenChange(!open)}>
          toggle-options
        </button>
        <SelectContext.Provider value={{ onValueChange, open }}>
          {children}
        </SelectContext.Provider>
      </div>
    ),
    SelectTrigger: ({ children }: { children: ReactNode }) => (
      <div data-testid="select-trigger">{children}</div>
    ),
    SelectContent: ({ children }: { children: ReactNode }) => {
      const context = React.useContext(SelectContext);
      if (!context?.open) {
        return null;
      }
      return <div>{children}</div>;
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
          onClick={() => context?.onValueChange(value)}>
          {children}
        </button>
      );
    },
  };
});

const options = [
  { value: COMPLEXITY_VALUE, label: COMPLEXITY_LABEL },
  { value: 'expertise', label: 'We lack internal expertise' },
];

const ControlledHarness = ({
  initialValue,
}: {
  initialValue: string | undefined;
}) => {
  const [value, setValue] = useState<string | undefined>(initialValue);

  return (
    <SelectWithEditableField
      value={value}
      onChange={setValue}
      options={options}
      labels={{
        placeholder: PLACEHOLDER_TEXT,
        editableFieldLabel: OTHER_LABEL,
        editableFieldPlaceholder: OTHER_INPUT_PLACEHOLDER,
      }}
      editableFieldValue={OTHER_LABEL}
    />
  );
};

describe('SelectWithEditableField', () => {
  it('should display selected option label when controlled value matches an option', () => {
    // Given
    testRender(<ControlledHarness initialValue={COMPLEXITY_VALUE} />);

    // Then
    expect(screen.getByTestId('select-trigger')).toHaveTextContent(
      COMPLEXITY_LABEL
    );
  });

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
