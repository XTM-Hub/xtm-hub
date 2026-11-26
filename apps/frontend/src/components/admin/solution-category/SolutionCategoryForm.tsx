import { AppCombobox } from '@/components/ui/AppCombobox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Form, FormField } from '@/components/ui/form';
import { SheetFooter } from '@/components/ui/sheet';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { toComboboxOptionIds } from '@/utils/design-system/combobox';
import { Button, Input } from '@filigran/design-system';
import { FiligranProduct } from '@graphql/generated';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const productValues = Object.values(FiligranProduct) as [
  FiligranProduct,
  ...FiligranProduct[],
];

const productOptionIds = toComboboxOptionIds(
  productValues,
  (product) => product,
  (product) => product.toUpperCase()
);

export interface SolutionCategoryFormModel {
  id: string;
  name: string;
  product: FiligranProduct[];
}

export const solutionCategoryFormSchema = z.object({
  name: z.string().min(2, {
    error: 'SolutionCategory.Form.Error.Name',
  }),
  product: z.array(z.enum(productValues)),
});

const SolutionCategoryForm = ({
  solutionCategory,
  onClose,
  handleDelete,
  handleSubmit,
}: {
  solutionCategory?: SolutionCategoryFormModel;
  onClose: () => void;
  handleDelete?: () => void;
  handleSubmit: (values: z.infer<typeof solutionCategoryFormSchema>) => void;
}) => {
  const t = useTranslate();
  const form = useForm<z.infer<typeof solutionCategoryFormSchema>>({
    resolver: zodResolver(solutionCategoryFormSchema),
    defaultValues: {
      name: solutionCategory?.name ?? '',
      product: solutionCategory?.product ?? [],
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
          render={({ field, fieldState }) => (
            <Input
              label={t('SolutionCategory.Form.Name')}
              placeholder={t('SolutionCategory.Form.Name')}
              error={fieldState.error?.message}
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
              label={t('SolutionCategory.Form.Product')}
              placeholder={t('SolutionCategory.Form.Product')}
              error={fieldState.error?.message}
              options={productOptionIds.ids}
              value={field.value ?? []}
              onValueChange={field.onChange}
              getOptionLabel={productOptionIds.getOptionLabel}
            />
          )}
        />
        <SheetFooter
          className={solutionCategory ? 'sm:justify-between pb-0' : 'pt-2'}>
          {solutionCategory && (
            <ConfirmDialog
              confirmAnalyticsId="admin_solution_category_deletion_confirm"
              title={t('MenuActions.Delete')}
              confirmLabel={t('MenuActions.Delete')}
              destructive
              trigger={
                <Button
                  variant="destructive"
                  priority="secondary"
                  {...analyticsId('admin_solution_category_delete')}>
                  {t('MenuActions.Delete')}
                </Button>
              }
              onConfirm={() => handleDelete!()}>
              {t('SolutionCategory.Dialog.Text', {
                name: solutionCategory.name,
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
              {...analyticsId('admin_solution_category_submit')}>
              {t('Utils.Validate')}
            </Button>
          </div>
        </SheetFooter>
      </form>
    </Form>
  );
};

export default SolutionCategoryForm;
