import { AutoForm } from '@/components/ui/auto-form';
import { fileListCheck, JSON_FILE_ACCEPT } from '@/utils/documents';
import testRender from '@/utils/test/test-render';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const FIELD_LABEL = 'JSON file';
const SUBMIT_LABEL = 'Submit';
const JSON_FILE_NAME = 'dashboard.json';

const formSchema = z.object({
  document: z.custom<FileList>(fileListCheck),
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
      document: {
        label: FIELD_LABEL,
        fieldType: 'file',
        inputProps: { accept: JSON_FILE_ACCEPT },
      },
    }}>
    <button type="submit">{SUBMIT_LABEL}</button>
  </AutoForm>
);

describe('AutoFormFile', () => {
  it('should accept a JSON file whose browser MIME type is empty', async () => {
    // Given
    const onSubmit = vi.fn();
    const { user } = testRender(<TestForm onSubmit={onSubmit} />);
    const jsonFile = new File(['{}'], JSON_FILE_NAME, { type: '' });

    // When
    await user.upload(
      screen.getByLabelText(FIELD_LABEL, { selector: 'input' }),
      jsonFile
    );
    await user.click(screen.getByRole('button', { name: SUBMIT_LABEL }));

    // Then
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ document: [jsonFile] })
    );
  });
});
