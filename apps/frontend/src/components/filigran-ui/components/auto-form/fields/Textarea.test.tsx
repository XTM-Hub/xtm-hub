import { AutoForm } from '@/components/filigran-ui/components/auto-form';
import testRender from '@/utils/test/test-render';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const FIELD_LABEL = 'Summary';
const SUBMIT_LABEL = 'Submit';
const VALID_TEXT = 'A short summary';
const REJECTED_TEXT = 'TODO';
const ERROR_MESSAGE = 'Write a real summary';

const formSchema = z.object({
  summary: z
    .string()
    .refine((value) => value !== REJECTED_TEXT, { error: ERROR_MESSAGE }),
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
      summary: { label: FIELD_LABEL, fieldType: 'textarea' },
    }}>
    <button type="submit">{SUBMIT_LABEL}</button>
  </AutoForm>
);

describe('AutoFormTextarea', () => {
  it('should name the textarea with its label and mark it required', () => {
    // Given / When
    testRender(<TestForm onSubmit={vi.fn()} />);

    // Then
    const textarea = screen.getByRole('textbox', { name: FIELD_LABEL });
    expect(textarea).toHaveAttribute('aria-required', 'true');
    expect(textarea).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('should submit the typed text', async () => {
    // Given
    const onSubmit = vi.fn();
    const { user } = testRender(<TestForm onSubmit={onSubmit} />);

    // When
    await user.type(
      screen.getByRole('textbox', { name: FIELD_LABEL }),
      VALID_TEXT
    );
    await user.click(screen.getByRole('button', { name: SUBMIT_LABEL }));

    // Then
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ summary: VALID_TEXT })
    );
  });

  it('should describe the textarea with the validation error when the text is rejected', async () => {
    // Given
    const onSubmit = vi.fn();
    const { user } = testRender(<TestForm onSubmit={onSubmit} />);
    const textarea = screen.getByRole('textbox', { name: FIELD_LABEL });
    await user.type(textarea, REJECTED_TEXT);

    // When
    await user.click(screen.getByRole('button', { name: SUBMIT_LABEL }));

    // Then
    expect(await screen.findByText(ERROR_MESSAGE)).toBeInTheDocument();
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(textarea).toHaveAccessibleDescription(ERROR_MESSAGE);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
