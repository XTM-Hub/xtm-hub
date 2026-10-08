import { AppCombobox } from '@/components/ui/AppCombobox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useTranslate } from '@/hooks/use-translate';
import { toComboboxOptionIds } from '@/utils/combobox-option-ids';
import { Button, ColorPicker, Input } from '@filigran/design-system';
import {
  Form,
  FormField,
  FormItem,
  FormMessage,
  SheetFooter,
} from '@filigran/ui';
import { FiligranProduct } from '@graphql/generated';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

export interface UseCaseFormModel {
  id: string;
  name: string;
  color: string;
  product: FiligranProduct[];
}

const productTagValues = Object.values(FiligranProduct) as [
  FiligranProduct,
  ...FiligranProduct[],
];

const productTagOptionIds = toComboboxOptionIds(
  productTagValues,
  (productTag) => productTag,
  (productTag) => productTag.toUpperCase()
);

export const useCaseFormSchema = z.object({
  name: z.string().min(2, {
    error: 'OrganizationForm.Error.Name',
  }),
  color: z
    .string()
    .refine((value) => /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(value ?? '')),
  product: z.array(z.enum(productTagValues)),
});

const UseCaseForm = ({
  useCase,
  handleSubmit,
  handleDelete,
  onClose,
}: {
  useCase?: UseCaseFormModel;
  handleDelete?: () => void;
  handleSubmit: (values: z.infer<typeof useCaseFormSchema>) => void;
  onClose: () => void;
}) => {
  const t = useTranslate();

  const form = useForm<z.infer<typeof useCaseFormSchema>>({
    resolver: zodResolver(useCaseFormSchema),
    defaultValues: {
      name: useCase?.name ?? '',
      color: useCase?.color ?? '#FFFFFF',
      product: useCase?.product ?? [],
    },
  });

  return (
    <Form {...form}>
      <form
        className="w-full space-y-xl"
        onSubmit={form.handleSubmit(handleSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <Input
              label={t('UseCaseForm.Name')}
              placeholder={t('UseCaseForm.Name')}
              {...field}
            />
          )}
        />
        <FormField
          control={form.control}
          name="product"
          render={({ field }) => (
            <FormItem>
              <AppCombobox
                multiple
                label={t('UseCaseForm.Product')}
                placeholder={t('UseCaseForm.Product')}
                options={productTagOptionIds.ids}
                value={field.value ?? []}
                onValueChange={field.onChange}
                getOptionLabel={productTagOptionIds.getOptionLabel}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="color"
          render={({ field: { value, onChange } }) => (
            <ColorPicker
              label={t('UseCaseForm.Color')}
              placeholder={t('UseCaseForm.Color')}
              maxLength={7}
              value={value ?? ''}
              onValueChange={onChange}
            />
          )}
        />

        <SheetFooter className={useCase ? 'sm:justify-between pb-0' : 'pt-2'}>
          {useCase && (
            <ConfirmDialog
              title={t('MenuActions.Delete')}
              confirmLabel={t('MenuActions.Delete')}
              destructive
              trigger={
                <Button
                  variant="destructive"
                  priority="secondary">
                  {t('MenuActions.Delete')}
                </Button>
              }
              onConfirm={() => handleDelete!()}>
              {t('DeleteUseCaseDialog.TextDeleteUseCase', {
                name: useCase.name,
              })}
            </ConfirmDialog>
          )}
          <div className="flex gap-s">
            <Button
              priority="secondary"
              type="button"
              onClick={onClose}>
              {t('Utils.Cancel')}
            </Button>
            <Button
              disabled={!form.formState.isDirty}
              type="submit">
              {t('Utils.Validate')}
            </Button>
          </div>
        </SheetFooter>
      </form>
    </Form>
  );
};

export default UseCaseForm;
