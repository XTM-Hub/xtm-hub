import testRender from '@/utils/test/test-render';
import { zodResolver } from '@hookform/resolvers/zod';
import { screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './Form';

const LABEL_TEXT = 'Name';
const REQUIRED_MESSAGE = 'Name is required';
const HELPER_TEXT = 'Shown to every member';
const SUBMIT_LABEL = 'Submit';
const REQUIRED_STAR = '*';
const ERROR_COLOUR_CLASS = 'text-input-error';
const ITEM_GAP_CLASS = 'gap-2';
const ITEM_CALLER_GAP_CLASS = 'gap-3';
const ITEM_LAYOUT_CLASS = 'md:flex-1';
const MESSAGE_LAYOUT_CLASS = 'mt-2';

const schema = z.object({ name: z.string().min(1, REQUIRED_MESSAGE) });

type FormValues = z.infer<typeof schema>;

const TestForm = ({
  itemClassName,
  required,
  messageChildren,
  messageClassName,
}: {
  itemClassName?: string;
  required?: boolean;
  messageChildren?: ReactNode;
  messageClassName?: string;
}) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => undefined)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className={itemClassName}>
              <FormLabel required={required}>{LABEL_TEXT}</FormLabel>
              <FormControl>
                <input {...field} />
              </FormControl>
              <FormMessage className={messageClassName}>
                {messageChildren}
              </FormMessage>
            </FormItem>
          )}
        />
        <button type="submit">{SUBMIT_LABEL}</button>
      </form>
    </Form>
  );
};

const LabelOutsideField = () => {
  const form = useForm<FormValues>({ defaultValues: { name: '' } });

  return (
    <Form {...form}>
      <FormLabel>{LABEL_TEXT}</FormLabel>
    </Form>
  );
};

describe('Form', () => {
  it('should name the control when FormLabel and FormControl share a FormItem', () => {
    // Given
    testRender(<TestForm />);

    // When
    const control = screen.getByLabelText(LABEL_TEXT);

    // Then
    expect(control.tagName).toBe('INPUT');
  });

  it('should merge the classes when FormItem is given a className', () => {
    // Given
    testRender(
      <TestForm
        itemClassName={`${ITEM_CALLER_GAP_CLASS} ${ITEM_LAYOUT_CLASS}`}
      />
    );

    // When
    const item = screen.getByLabelText(LABEL_TEXT).parentElement;

    // Then
    expect(item).toHaveClass(ITEM_CALLER_GAP_CLASS, ITEM_LAYOUT_CLASS);
    expect(item).not.toHaveClass(ITEM_GAP_CLASS);
  });

  it('should mark the control invalid when a submit fails', async () => {
    // Given
    const { user } = testRender(<TestForm />);

    // When
    await user.click(screen.getByRole('button', { name: SUBMIT_LABEL }));
    await screen.findByText(REQUIRED_MESSAGE);

    // Then
    expect(screen.getByLabelText(LABEL_TEXT)).toHaveAttribute(
      'aria-invalid',
      'true'
    );
  });

  it('should describe the control with the message when a submit fails', async () => {
    // Given
    const { user } = testRender(<TestForm />);

    // When
    await user.click(screen.getByRole('button', { name: SUBMIT_LABEL }));
    const message = await screen.findByText(REQUIRED_MESSAGE);

    // Then
    expect(screen.getByLabelText(LABEL_TEXT)).toHaveAttribute(
      'aria-describedby',
      message.id
    );
  });

  it('should draw the message in the error colour when a submit fails', async () => {
    // Given
    const { user } = testRender(<TestForm />);

    // When
    await user.click(screen.getByRole('button', { name: SUBMIT_LABEL }));
    const message = await screen.findByText(REQUIRED_MESSAGE);

    // Then
    expect(message).toHaveClass(ERROR_COLOUR_CLASS);
  });

  it('should draw the label in the error colour when a submit fails', async () => {
    // Given
    const { user } = testRender(<TestForm />);

    // When
    await user.click(screen.getByRole('button', { name: SUBMIT_LABEL }));
    await screen.findByText(REQUIRED_MESSAGE);

    // Then
    expect(screen.getByText(LABEL_TEXT)).toHaveClass(ERROR_COLOUR_CLASS);
  });

  it('should draw no message while the field is valid', () => {
    // Given
    testRender(<TestForm />);

    // When
    const message = screen.queryByText(REQUIRED_MESSAGE);

    // Then
    expect(message).not.toBeInTheDocument();
  });

  it('should not describe the control while the field is valid', () => {
    // Given
    testRender(<TestForm />);

    // When
    const control = screen.getByLabelText(LABEL_TEXT);

    // Then
    expect(control).not.toHaveAttribute('aria-describedby');
  });

  it('should not mark the control invalid while the field is valid', () => {
    // Given
    testRender(<TestForm />);

    // When
    const control = screen.getByLabelText(LABEL_TEXT);

    // Then
    expect(control).toHaveAttribute('aria-invalid', 'false');
  });

  it('should show its children when FormMessage has no error', () => {
    // Given
    testRender(<TestForm messageChildren={HELPER_TEXT} />);

    // When
    const message = screen.queryByText(HELPER_TEXT);

    // Then
    expect(message).toBeInTheDocument();
  });

  it('should replace its children with the error message when a submit fails', async () => {
    // Given
    const { user } = testRender(<TestForm messageChildren={HELPER_TEXT} />);

    // When
    await user.click(screen.getByRole('button', { name: SUBMIT_LABEL }));
    await screen.findByText(REQUIRED_MESSAGE);

    // Then
    expect(screen.queryByText(HELPER_TEXT)).not.toBeInTheDocument();
  });

  it('should keep the caller className next to the error colour on FormMessage', () => {
    // Given
    testRender(
      <TestForm
        messageChildren={HELPER_TEXT}
        messageClassName={MESSAGE_LAYOUT_CLASS}
      />
    );

    // When
    const message = screen.getByText(HELPER_TEXT);

    // Then
    expect(message).toHaveClass(MESSAGE_LAYOUT_CLASS, ERROR_COLOUR_CLASS);
  });

  it('should draw the required star when FormLabel is required', () => {
    // Given
    testRender(<TestForm required />);

    // When
    const star = screen.queryByText(REQUIRED_STAR);

    // Then
    expect(star).toBeInTheDocument();
  });

  it('should render FormLabel without throwing when it sits outside a FormField', () => {
    // Given
    testRender(<LabelOutsideField />);

    // When
    const label = screen.getByText(LABEL_TEXT);

    // Then
    expect(label.tagName).toBe('LABEL');
  });
});
