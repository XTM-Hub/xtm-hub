import { ServiceFormUseCasesField } from '@/components/service/form/UseCasesField';
import { AlertDialogComponent } from '@/components/ui/AlertDialog';
import MarkdownInput from '@/components/ui/MarkdownInput';
import { DeleteIcon } from '@filigran/icon';
import {
  Button,
  FileInput,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SheetFooter,
  Switch,
} from '@filigran/ui';
import { FiligranProduct } from '@graphql/generated';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

const productValues = Object.values(FiligranProduct) as [
  FiligranProduct,
  ...FiligranProduct[],
];

export interface VotableFeatureFormModel {
  id: string;
  title: string;
  short_description: string;
  description: string;
  product: FiligranProduct;
  use_cases: { id: string; name: string }[];
  illustration_document_id?: string | null;
  position: number;
  active: boolean;
}

const buildVotableFeatureFormSchema = (t: (key: string) => string) =>
  z.object({
    title: z.string().min(2, { error: t('VotingRound.Feature.Error.Title') }),
    short_description: z
      .string()
      .min(2, { error: t('VotingRound.Feature.Error.ShortDescription') })
      .max(215, { error: t('VotingRound.Feature.Error.ShortDescriptionMax') }),
    description: z
      .string()
      .min(2, { error: t('VotingRound.Feature.Error.Description') }),
    product: z.enum(productValues),
    use_case_ids: z.array(z.string()),
    illustration_document: z.custom<FileList>().optional(),
    remove_illustration: z.boolean(),
    position: z.string().regex(/^\d+$/, {
      error: t('VotingRound.Feature.Error.Position'),
    }),
    active: z.boolean(),
  });

export const votableFeatureFormSchema = buildVotableFeatureFormSchema(
  (key) => key
);

export type VotableFeatureFormValues = z.infer<typeof votableFeatureFormSchema>;

const VotableFeatureForm = ({
  feature,
  serviceInstanceId,
  onClose,
  handleDelete,
  handleSubmit,
}: {
  feature?: VotableFeatureFormModel;
  serviceInstanceId: string;
  onClose: () => void;
  handleDelete?: () => void;
  handleSubmit: (values: VotableFeatureFormValues) => void;
}) => {
  const t = useTranslations();
  const formSchema = useMemo(() => buildVotableFeatureFormSchema(t), [t]);
  const form = useForm<VotableFeatureFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: feature?.title ?? '',
      short_description: feature?.short_description ?? '',
      description: feature?.description ?? '',
      product: feature?.product ?? FiligranProduct.Opencti,
      use_case_ids: feature?.use_cases.map(({ id }) => id) ?? [],
      illustration_document: undefined,
      remove_illustration: false,
      position: String(feature?.position ?? 0),
      active: feature?.active ?? true,
    },
  });

  const selectedProduct = useWatch({
    control: form.control,
    name: 'product',
  });
  const removeIllustration = useWatch({
    control: form.control,
    name: 'remove_illustration',
  });
  const showCurrentIllustration =
    !!feature?.illustration_document_id && !removeIllustration;

  return (
    <Form {...form}>
      <form
        className="w-full space-y-l"
        onSubmit={form.handleSubmit(handleSubmit)}>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('VotingRound.Feature.Title')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('VotingRound.Feature.Title')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="product"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('VotingRound.Feature.Product')}</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    // Use cases are scoped per product, so the previous
                    // selection no longer applies.
                    form.setValue('use_case_ids', [], { shouldDirty: true });
                  }}>
                  <SelectTrigger aria-label={t('VotingRound.Feature.Product')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {productValues.map((product) => (
                      <SelectItem
                        key={product}
                        value={product}>
                        {product.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="short_description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('VotingRound.Feature.ShortDescription')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('VotingRound.Feature.ShortDescription')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('VotingRound.Feature.Description')}</FormLabel>
              <FormControl>
                <MarkdownInput
                  value={field.value}
                  onChange={(value) => field.onChange(value ?? '')}
                  placeholder={t('VotingRound.Feature.DescriptionPlaceholder')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="use_case_ids"
          render={({ field }) => (
            <ServiceFormUseCasesField
              field={field}
              product={selectedProduct}
            />
          )}
        />
        <FormField
          control={form.control}
          name="illustration_document"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('VotingRound.Feature.Illustration')}</FormLabel>
              {showCurrentIllustration && (
                <div
                  style={{
                    backgroundImage: `url(/document/images/${serviceInstanceId}/${feature!.illustration_document_id})`,
                    backgroundSize: 'cover',
                  }}
                  className="relative min-h-[10rem] rounded border">
                  <div className="flex h-12 flex-row items-center justify-end bg-elevation-background-layer-1 opacity-90">
                    <Button
                      variant="secondary-destructive"
                      size="icon"
                      type="button"
                      aria-label={t('VotingRound.Feature.RemoveIllustration')}
                      className="m-s"
                      onClick={() =>
                        form.setValue('remove_illustration', true, {
                          shouldDirty: true,
                        })
                      }>
                      <DeleteIcon className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
              <FormControl>
                <FileInput
                  {...field}
                  texts={{
                    selectFile: t('Service.Vault.FileForm.SelectDocument'),
                    noFile: t('Service.Vault.FileForm.NoDocument'),
                    dropFiles: t('Service.Vault.FileForm.DropDocuments'),
                  }}
                  allowedTypes={'image/jpeg, image/gif, image/png, image/svg'}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="position"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('VotingRound.Feature.Position')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex flex-col items-start gap-s space-y-0">
              <FormLabel>{t('VotingRound.Feature.Active')}</FormLabel>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label={t('VotingRound.Feature.Active')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <SheetFooter className={feature ? 'sm:justify-between pb-0' : 'pt-2'}>
          {feature && (
            <AlertDialogComponent
              AlertTitle={t('MenuActions.Delete')}
              actionButtonText={t('MenuActions.Delete')}
              variantName="destructive"
              triggerElement={
                <Button variant="secondary-destructive">
                  {t('MenuActions.Delete')}
                </Button>
              }
              onClickContinue={() => handleDelete!()}>
              {t('VotingRound.Dialog.DeleteFeature', { title: feature.title })}
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

export default VotableFeatureForm;
