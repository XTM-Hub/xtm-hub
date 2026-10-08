import { ServiceFormLogoField } from '@/components/service/form/LogoField';
import testRender from '@/utils/test/test-render';
import { Form, FormField } from '@filigran/ui';
import { DocumentSourceType } from '@graphql/generated';
import { screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

const LOGO_FILE_NAME = 'logo.png';
const LOGO_FILE_TYPE = 'image/png';
const SUBMIT_LABEL = 'Submit';

type FormValues = {
  logo?: File[];
};

const buildLogoFile = () =>
  new File(['logo'], LOGO_FILE_NAME, { type: LOGO_FILE_TYPE });

const TestForm = ({
  defaultLogo,
  onSubmit,
}: {
  defaultLogo?: File[];
  onSubmit: (values: FormValues) => void;
}) => {
  const form = useForm<FormValues>({ defaultValues: { logo: defaultLogo } });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="logo"
          render={({ field }) => <ServiceFormLogoField field={field} />}
        />
        <button type="submit">{SUBMIT_LABEL}</button>
      </form>
    </Form>
  );
};

describe('ServiceFormLogoField', () => {
  it('should write one internal file with its preview when an image is picked', async () => {
    // Given
    const onSubmit = vi.fn();
    const { user } = testRender(<TestForm onSubmit={onSubmit} />);

    // When
    await user.upload(
      screen.getByLabelText('Service.Form.LogoLabel', { selector: 'input' }),
      buildLogoFile()
    );
    await screen.findByRole('button', { name: 'Utils.Delete' });
    await user.click(screen.getByRole('button', { name: SUBMIT_LABEL }));

    // Then
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          logo: [
            expect.objectContaining({
              name: LOGO_FILE_NAME,
              preview: expect.stringMatching(`^data:${LOGO_FILE_TYPE};base64,`),
              source_type: DocumentSourceType.Internal,
            }),
          ],
        },
        expect.anything()
      )
    );
  });

  it('should write an empty list when the picked logo is cleared', async () => {
    // Given
    const onSubmit = vi.fn();
    const { user } = testRender(
      <TestForm
        defaultLogo={[buildLogoFile()]}
        onSubmit={onSubmit}
      />
    );

    // When
    await user.click(
      screen.getByRole('button', { name: /DesignSystem\.FileSelect\.Clear/ })
    );
    await user.click(screen.getByRole('button', { name: SUBMIT_LABEL }));

    // Then
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ logo: [] }, expect.anything())
    );
  });
});
