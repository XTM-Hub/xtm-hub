import { ServiceFormDescriptionField } from '@/components/service/form/DescriptionField';
import { Form, FormField } from '@/components/ui/form';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

const TestForm = () => {
  const form = useForm<{ description?: string }>();

  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <ServiceFormDescriptionField
            field={field}
            documentType="CSV Feed"
          />
        )}
      />
    </Form>
  );
};

describe('ServiceFormDescriptionField', () => {
  it('should name the markdown editor after its form label', () => {
    testRender(<TestForm />);

    expect(
      screen.getByRole('textbox', { name: 'Service.Form.DescriptionLabel' })
    ).toHaveAttribute('placeholder', 'Service.Form.DescriptionPlaceholder');
  });
});
