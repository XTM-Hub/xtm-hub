'use client';

import { AutoForm } from '@/components/ui/auto-form';
import { useTranslate } from '@/hooks/use-translate';
import { Button } from '@filigran/design-system';
import { z } from 'zod';

export enum CONNECTABLE_PRODUCTS {
  OpenCTI = 'OpenCTI',
  OpenAEV = 'OpenAEV',
}
export const connectFromHubFormSchema = z.object({
  product: z.enum(CONNECTABLE_PRODUCTS),
  productUrl: z.url({ error: 'Product URL must be a valid URL' }),
});

interface ConnectFromHubFormProps {
  onSubmit: (values: z.infer<typeof connectFromHubFormSchema>) => void;
}

const ConnectFromHubForm = ({ onSubmit }: ConnectFromHubFormProps) => {
  const t = useTranslate();

  return (
    <AutoForm
      formSchema={connectFromHubFormSchema}
      onSubmit={onSubmit}
      fieldConfig={{
        product: {
          label: t('Register.Details.Product'),
          inputProps: {
            placeholder: CONNECTABLE_PRODUCTS.OpenCTI,
          },
        },
        productUrl: {
          label: t('Register.Details.ProductURL'),
          inputProps: {
            placeholder: t('Register.Details.ProductURL'),
          },
        },
      }}>
      <div className="flex justify-end">
        <Button type="submit">{t('Utils.Continue')}</Button>
      </div>
    </AutoForm>
  );
};

export default ConnectFromHubForm;
