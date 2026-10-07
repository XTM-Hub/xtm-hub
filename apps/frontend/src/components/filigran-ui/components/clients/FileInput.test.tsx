import { FileInput } from '@/components/filigran-ui/components/clients/FileInput';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

const FileForm = ({ allowedTypes }: { allowedTypes: string }) => {
  const form = useForm<{ file?: FileList }>();
  return (
    <FormProvider {...form}>
      <FileInput
        name="file"
        allowedTypes={allowedTypes}
      />
      <p data-testid="error">{form.formState.errors.file?.message}</p>
    </FormProvider>
  );
};

const selectFile = (fileName: string, allowedTypes = 'application/json') => {
  const { container } = render(<FileForm allowedTypes={allowedTypes} />);
  const input = container.querySelector('input[type="file"]')!;
  fireEvent.change(input, {
    target: { files: [new File(['{}'], fileName)] },
  });
};

const expectAccepted = (fileName: string) => {
  expect(screen.getByText(fileName)).toBeInTheDocument();
  expect(screen.getByTestId('error')).toBeEmptyDOMElement();
};

const expectRefused = (fileName: string) => {
  expect(screen.getByTestId('error')).toHaveTextContent('Format not accepted');
  expect(screen.queryByText(fileName)).not.toBeInTheDocument();
};

describe('FileInput', () => {
  it.each(['pack.json', 'credential.access.hunts.json', 'PACK.JSON'])(
    'accepts %s for a JSON file input',
    (fileName) => {
      selectFile(fileName);

      expectAccepted(fileName);
    }
  );

  it.each([
    'pack.zip',
    'pack.json.zip',
    'pack.son',
    'pack.on',
    'pack',
    'pack.',
  ])('refuses %s for a JSON file input', (fileName) => {
    selectFile(fileName);

    expectRefused(fileName);
  });

  it.each(['logo.png', 'logo.JPEG'])(
    'accepts %s for an image input of several types',
    (fileName) => {
      selectFile(fileName, 'image/jpeg, image/png');

      expectAccepted(fileName);
    }
  );

  it('refuses a type the image input does not list', () => {
    selectFile('logo.gif', 'image/jpeg, image/png');

    expectRefused('logo.gif');
  });
});
