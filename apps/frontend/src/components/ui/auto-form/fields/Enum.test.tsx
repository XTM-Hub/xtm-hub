import { AutoForm } from '@/components/ui/auto-form';
import testRender from '@/utils/test/test-render';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const FIELD_LABEL = 'Product';
const PLACEHOLDER = 'Pick a product';
const SUBMIT_LABEL = 'Submit';
const ALLOWED = 'OpenCTI';
const FORBIDDEN = 'OpenAEV';
const ERROR_MESSAGE = 'This product cannot be picked';

const formSchema = z.object({
  product: z
    .enum([ALLOWED, FORBIDDEN])
    .refine((value) => value !== FORBIDDEN, { error: ERROR_MESSAGE }),
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
      product: {
        label: FIELD_LABEL,
        inputProps: { placeholder: PLACEHOLDER },
      },
    }}>
    <button type="submit">{SUBMIT_LABEL}</button>
  </AutoForm>
);

describe('AutoFormEnum', () => {
  it('should name the combobox with its label and mark it required', () => {
    // Given / When
    testRender(<TestForm onSubmit={vi.fn()} />);

    // Then
    const combobox = screen.getByRole('combobox', { name: FIELD_LABEL });
    expect(combobox).toHaveTextContent(PLACEHOLDER);
    expect(screen.getByText(FIELD_LABEL)).toHaveTextContent(`${FIELD_LABEL}*`);
    expect(combobox).not.toHaveAttribute('aria-describedby');
  });

  it('should submit the picked option', async () => {
    // Given
    const onSubmit = vi.fn();
    const { user } = testRender(<TestForm onSubmit={onSubmit} />);

    // When
    await user.click(screen.getByRole('combobox', { name: FIELD_LABEL }));
    await user.click(screen.getByRole('option', { name: ALLOWED }));
    await user.click(screen.getByRole('button', { name: SUBMIT_LABEL }));

    // Then
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ product: ALLOWED })
    );
  });

  it('should describe the combobox with the validation error when the value is rejected', async () => {
    // Given
    const onSubmit = vi.fn();
    const { user } = testRender(<TestForm onSubmit={onSubmit} />);
    await user.click(screen.getByRole('combobox', { name: FIELD_LABEL }));
    await user.click(screen.getByRole('option', { name: FORBIDDEN }));

    // When
    await user.click(screen.getByRole('button', { name: SUBMIT_LABEL }));

    // Then
    expect(await screen.findByText(ERROR_MESSAGE)).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: FIELD_LABEL })
    ).toHaveAccessibleDescription(ERROR_MESSAGE);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
