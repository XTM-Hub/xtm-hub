import { AlertDialogComponent } from '@/components/ui/AlertDialog';
import { useTranslate } from '@/hooks/use-translate';
import {
  Button,
  ColorPicker,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  MultiSelectFormField,
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

const productTagOptions = productTagValues.map((productTag) => ({
  id: productTag,
  label: productTag.toUpperCase(),
}));

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
            <FormItem>
              <FormLabel>{t('UseCaseForm.Name')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('UseCaseForm.Name')}
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="product"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('UseCaseForm.Product')}</FormLabel>
              <FormControl>
                <MultiSelectFormField
                  options={productTagOptions}
                  popoverContentClassName="bg-elevation-background-layer-3"
                  keyValue="id"
                  keyLabel="label"
                  defaultValue={field.value}
                  value={field.value}
                  onValueChange={field.onChange}
                  noResultString={t('Utils.NotFound')}
                  placeholder={t('UseCaseForm.Product')}
                  variant="inverted"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="color"
          render={({ field: { value, onChange } }) => (
            <FormItem>
              <FormLabel>{t('UseCaseForm.Color')}</FormLabel>
              <ColorPicker
                value={value ?? ''}
                onChange={onChange}
              />
            </FormItem>
          )}
        />

        <SheetFooter className={useCase ? 'sm:justify-between pb-0' : 'pt-2'}>
          {useCase && (
            <AlertDialogComponent
              AlertTitle={t('MenuActions.Delete')}
              actionButtonText={t('MenuActions.Delete')}
              variantName={'destructive'}
              triggerElement={
                <Button variant="secondary-destructive">
                  {t('MenuActions.Delete')}
                </Button>
              }
              onClickContinue={() => handleDelete!()}>
              {t('DeleteUseCaseDialog.TextDeleteUseCase', {
                name: useCase.name,
              })}
            </AlertDialogComponent>
          )}
          <div className="flex gap-s">
            <Button
              variant="secondary"
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
