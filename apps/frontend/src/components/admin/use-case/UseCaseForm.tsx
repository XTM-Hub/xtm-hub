import { AppCombobox } from '@/components/ui/AppCombobox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Form, FormField } from '@/components/ui/form';
import { SheetFooter } from '@/components/ui/sheet';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { toComboboxOptionIds } from '@/utils/design-system/combobox';
import { Button, ColorPicker, Input } from '@filigran/design-system';
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
        className="w-full space-y-6"
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
          render={({ field, fieldState }) => (
            <AppCombobox
              formField
              multiple
              label={t('UseCaseForm.Product')}
              placeholder={t('UseCaseForm.Product')}
              error={fieldState.error?.message}
              options={productTagOptionIds.ids}
              value={field.value ?? []}
              onValueChange={field.onChange}
              getOptionLabel={productTagOptionIds.getOptionLabel}
            />
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
              confirmAnalyticsId="admin_use_case_deletion_confirm"
              title={t('MenuActions.Delete')}
              confirmLabel={t('MenuActions.Delete')}
              destructive
              trigger={
                <Button
                  variant="destructive"
                  priority="secondary"
                  {...analyticsId('admin_use_case_delete')}>
                  {t('MenuActions.Delete')}
                </Button>
              }
              onConfirm={() => handleDelete!()}>
              {t('DeleteUseCaseDialog.TextDeleteUseCase', {
                name: useCase.name,
              })}
            </ConfirmDialog>
          )}
          <div className="flex gap-2">
            <Button
              priority="secondary"
              type="button"
              {...analyticsId('admin_form_cancel')}
              onClick={onClose}>
              {t('Utils.Cancel')}
            </Button>
            <Button
              disabled={!form.formState.isDirty}
              type="submit"
              {...analyticsId('admin_use_case_submit')}>
              {t('Utils.Validate')}
            </Button>
          </div>
        </SheetFooter>
      </form>
    </Form>
  );
};

export default UseCaseForm;
