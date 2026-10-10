import { AutoForm } from '@/components/ui/auto-form';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const FIELD_LABEL = 'Start date';
const SUBMIT_LABEL = 'Submit';
const ERROR_MESSAGE = 'Pick a valid start date';
const UNPARSEABLE_DATE = '99/99/9999';

const formSchema = z.object({
  start_date: z.date({ error: ERROR_MESSAGE }),
});

const TestForm = ({
  onSubmit,
}: {
  onSubmit: (values: z.infer<typeof formSchema>) => void;
}) => (
  <AutoForm
    formSchema={formSchema}
    onSubmit={(values) => onSubmit(values)}
    fieldConfig={{
      start_date: { label: FIELD_LABEL },
    }}>
    <button type="submit">{SUBMIT_LABEL}</button>
  </AutoForm>
);

describe('AutoFormDate', () => {
  it('should name the date field with its label and mark it required', () => {
    // Given / When
    testRender(<TestForm onSubmit={vi.fn()} />);

    // Then
    const input = screen.getByRole('textbox', { name: FIELD_LABEL });
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText(ERROR_MESSAGE)).not.toBeInTheDocument();
  });

  it('should describe the date field with the validation error when the typed date is invalid', async () => {
    // Given
    const onSubmit = vi.fn();
    const { user } = testRender(<TestForm onSubmit={onSubmit} />);
    const input = screen.getByRole('textbox', { name: FIELD_LABEL });
    await user.type(input, UNPARSEABLE_DATE);

    // When
    await user.click(screen.getByRole('button', { name: SUBMIT_LABEL }));

    // Then
    expect(await screen.findByText(ERROR_MESSAGE)).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(ERROR_MESSAGE);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
