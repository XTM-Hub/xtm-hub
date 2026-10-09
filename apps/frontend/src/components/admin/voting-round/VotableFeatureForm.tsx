import { VOTING_PRODUCTS } from '@/components/feature-voting/feature-voting.const';
import { ServiceFormUseCasesField } from '@/components/service/form/UseCasesField';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import MarkdownInput from '@/components/ui/MarkdownInput';
import { SelectField } from '@/components/ui/SelectField';
import { useTranslate } from '@/hooks/use-translate';
import {
  fromFileSelectValue,
  getFileSelectLabels,
  toFileSelectValue,
} from '@/utils/design-system/file-select';
import {
  Button,
  FileSelect,
  IconButton,
  Input,
  Switch,
} from '@filigran/design-system';
import { DeleteIcon } from '@filigran/icon';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  SheetFooter,
} from '@filigran/ui';
import { FiligranProduct } from '@graphql/generated';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

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
    product: z.enum(VOTING_PRODUCTS),
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
  const t = useTranslate();
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
          render={({ field, fieldState }) => (
            <Input
              label={t('VotingRound.Feature.Title')}
              placeholder={t('VotingRound.Feature.Title')}
              error={fieldState.error?.message}
              {...field}
            />
          )}
        />
        <FormField
          control={form.control}
          name="product"
          render={({ field, fieldState }) => (
            <SelectField
              label={t('VotingRound.Feature.Product')}
              options={VOTING_PRODUCTS.map((product) => ({
                value: product,
                label: product.toUpperCase(),
              }))}
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                // Use cases are scoped per product, so the previous
                // selection no longer applies.
                form.setValue('use_case_ids', [], { shouldDirty: true });
              }}
              error={fieldState.error?.message}
              contentClassName="layer-2"
            />
          )}
        />
        <FormField
          control={form.control}
          name="short_description"
          render={({ field, fieldState }) => (
            <Input
              label={t('VotingRound.Feature.ShortDescription')}
              placeholder={t('VotingRound.Feature.ShortDescription')}
              error={fieldState.error?.message}
              {...field}
            />
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
                    <IconButton
                      variant="destructive"
                      priority="secondary"
                      type="button"
                      aria-label={t('VotingRound.Feature.RemoveIllustration')}
                      className="m-s"
                      icon={<DeleteIcon className="size-4" />}
                      onClick={() =>
                        form.setValue('remove_illustration', true, {
                          shouldDirty: true,
                        })
                      }
                    />
                  </div>
                </div>
              )}
              <FormControl>
                <FileSelect
                  {...getFileSelectLabels(t)}
                  aria-label={t('VotingRound.Feature.Illustration')}
                  triggerLabel={t('Service.FileForm.SelectDocument')}
                  placeholder={t('Service.FileForm.NoDocument')}
                  accept="image/jpeg, image/gif, image/png, image/svg+xml"
                  name={field.name}
                  ref={field.ref}
                  value={toFileSelectValue(field.value)}
                  onValueChange={(next) =>
                    field.onChange(fromFileSelectValue(next))
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="position"
          render={({ field, fieldState }) => (
            <Input
              label={t('VotingRound.Feature.Position')}
              type="number"
              min={0}
              error={fieldState.error?.message}
              {...field}
            />
          )}
        />
        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <Switch
              label={t('VotingRound.Feature.Active')}
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <SheetFooter className={feature ? 'sm:justify-between pb-0' : 'pt-2'}>
          {feature && (
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
              {t('VotingRound.Dialog.DeleteFeature', { title: feature.title })}
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

export default VotableFeatureForm;
