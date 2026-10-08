import { AlertDialogComponent } from '@/components/ui/AlertDialog';
import { AppCombobox } from '@/components/ui/AppCombobox';
import { useTranslate } from '@/hooks/use-translate';
import { toComboboxOptionIds } from '@/utils/combobox-option-ids';
import { Button, Input } from '@filigran/design-system';
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
        className="w-full space-y-xl"
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
          render={({ field }) => (
            <FormItem>
              <AppCombobox
                multiple
                label={t('SolutionCategory.Form.Product')}
                placeholder={t('SolutionCategory.Form.Product')}
                options={productOptionIds.ids}
                value={field.value ?? []}
                onValueChange={field.onChange}
                getOptionLabel={productOptionIds.getOptionLabel}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <SheetFooter
          className={solutionCategory ? 'sm:justify-between pb-0' : 'pt-2'}>
          {solutionCategory && (
            <AlertDialogComponent
              AlertTitle={t('MenuActions.Delete')}
              actionButtonText={t('MenuActions.Delete')}
              variantName="destructive"
              triggerElement={
                <Button
                  variant="destructive"
                  priority="secondary">
                  {t('MenuActions.Delete')}
                </Button>
              }
              onClickContinue={() => handleDelete!()}>
              {t('SolutionCategory.Dialog.Text', {
                name: solutionCategory.name,
              })}
            </AlertDialogComponent>
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

export default SolutionCategoryForm;
