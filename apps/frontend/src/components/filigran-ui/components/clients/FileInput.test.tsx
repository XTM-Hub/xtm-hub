import { FileInput } from '@/components/filigran-ui/components/clients/FileInput';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

const JsonFileForm = () => {
  const form = useForm<{ pack?: FileList }>();
  return (
    <FormProvider {...form}>
      <FileInput
        name="pack"
        allowedTypes="application/json"
      />
      <p data-testid="error">{form.formState.errors.pack?.message}</p>
    </FormProvider>
  );
};

const selectFile = (fileName: string) => {
  const { container } = render(<JsonFileForm />);
  const input = container.querySelector('input[type="file"]')!;
  fireEvent.change(input, {
    target: { files: [new File(['{}'], fileName)] },
  });
};

describe('FileInput', () => {
  it.each(['pack.json', 'credential.access.hunts.json', 'PACK.JSON'])(
    'accepts %s for a JSON file input',
    (fileName) => {
      selectFile(fileName);

      expect(screen.getByText(fileName)).toBeInTheDocument();
      expect(screen.getByTestId('error')).toBeEmptyDOMElement();
    }
  );

  it.each(['pack.zip', 'pack.json.zip', 'pack', 'pack.'])(
    'refuses %s for a JSON file input',
    (fileName) => {
      selectFile(fileName);

      expect(screen.getByTestId('error')).toHaveTextContent(
        'Format not accepted'
      );
      expect(screen.queryByText(fileName)).not.toBeInTheDocument();
    }
  );
});
