import { PortalContext } from '@/components/me/AppPortalContext';
import {
  REGIONS,
  REGIONS_VALUES,
  USE_CASES_BY_PLATFORM_IDENTIFIER,
} from '@/components/service/trial-instances/form-constants';
import { buildOngoingTrialWarningParams } from '@/components/service/trial-instances/xtm-platform-trial/xtm-platform-trial-form.utils';
import { AlertDialogComponent } from '@/components/ui/AlertDialog';
import { TranslatableEnumSelectField } from '@/components/ui/TranslatableEnumSelectField';
import { cn } from '@/lib/utils';
import { WarningIcon } from '@filigran/icon';
import {
  Button,
  Checkbox,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@filigran/ui';
import {
  DeploymentRequestActivitySector,
  DeploymentRequestJobTitle,
  DeploymentRequestUseCase,
  PlatformIdentifier,
} from '@graphql/generated';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useContext, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';

export const xtmPlatformTrialFormSchema = z.object({
  region: z.enum(REGIONS_VALUES),
  job_title: z.enum(DeploymentRequestJobTitle),
  activity_sector: z.enum(DeploymentRequestActivitySector),
  products: z.array(z.enum(PlatformIdentifier)),
  use_cases_by_product: z
    .array(
      z.object({
        platform_identifier: z.enum(PlatformIdentifier),
        use_case: z.enum(DeploymentRequestUseCase).optional(),
      })
    )
    .superRefine((entries, ctx) => {
      entries.forEach((entry, index) => {
        if (!entry.use_case) {
          ctx.addIssue({
            path: [index, 'use_case'],
            code: 'custom',
            message: 'Please select a use case.',
          });
        }
      });
    }),
  acceptTerms: z.boolean().refine((value) => value === true, {
    error: 'Please accept the MSSA to continue.',
  }),
});

const SELECTABLE_PRODUCTS = [
  PlatformIdentifier.Opencti,
  PlatformIdentifier.Openaev,
];

interface XtmPlatformTrialFormProps {
  handleSubmit: (values: z.infer<typeof xtmPlatformTrialFormSchema>) => void;
  hasOngoingStandaloneTrials?: boolean;
  ongoingStandaloneTrialProducts?: PlatformIdentifier[];
}

export const XtmPlatformTrialForm = ({
  handleSubmit,
  hasOngoingStandaloneTrials = false,
  ongoingStandaloneTrialProducts = [],
}: XtmPlatformTrialFormProps) => {
  const t = useTranslations();
  const locale = useLocale();
  const selectLayerClassName = 'layer-2';
  const selectTriggerClassName = cn(selectLayerClassName);
  const selectContentClassName = cn(selectLayerClassName);
  const { me } = useContext(PortalContext);

  const ongoingTrialWarningParams = buildOngoingTrialWarningParams(
    ongoingStandaloneTrialProducts,
    (platformIdentifier) => t(`PlatformIdentifier.${platformIdentifier}`),
    locale
  );

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<z.infer<
    typeof xtmPlatformTrialFormSchema
  > | null>(null);

  const form = useForm<z.infer<typeof xtmPlatformTrialFormSchema>>({
    resolver: zodResolver(xtmPlatformTrialFormSchema),
    defaultValues: {
      products: [
        PlatformIdentifier.Opencti,
        PlatformIdentifier.Openaev,
        PlatformIdentifier.Xtmone,
      ],
      use_cases_by_product: SELECTABLE_PRODUCTS.map((platformIdentifier) => ({
        platform_identifier: platformIdentifier,
        use_case: undefined,
      })),
      acceptTerms: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'use_cases_by_product',
  });

  const products = form.watch('products');

  const hasSelectableProduct = products.some(
    (product) => product !== PlatformIdentifier.Xtmone
  );

  const toggleProduct = (
    platformIdentifier: PlatformIdentifier,
    checked: boolean
  ) => {
    if (checked) {
      form.setValue('products', [...products, platformIdentifier]);
      append({
        platform_identifier: platformIdentifier,
        use_case: undefined,
      });
      return;
    }
    form.setValue(
      'products',
      products.filter((product) => product !== platformIdentifier)
    );
    const index = fields.findIndex(
      (entry) => entry.platform_identifier === platformIdentifier
    );
    if (index !== -1) {
      remove(index);
    }
  };

  const onSubmit = (values: z.infer<typeof xtmPlatformTrialFormSchema>) => {
    if (hasOngoingStandaloneTrials) {
      setPendingValues(values);
      setIsConfirmOpen(true);
      return;
    }
    handleSubmit(values);
  };

  const onConfirmOngoingTrial = () => {
    if (pendingValues) {
      handleSubmit(pendingValues);
    }
    setIsConfirmOpen(false);
    setPendingValues(null);
  };

  return (
    <div className="flex w-full flex-col gap-xl rounded bg-elevation-background-layer-2 p-xl">
      <div className="flex items-center gap-l">
        <span className="text-content-body-base text-muted-foreground">
          {t('Service.Trials.Form.AssociatedEmail')}
        </span>
        <span className="txt-default-bold">{me?.email}</span>
      </div>

      <Form {...form}>
        <form
          className="flex w-full flex-col gap-l"
          onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-s rounded bg-hover p-l bg-elevation-background-layer-2">
            <h3 className="txt-title-xs">
              {t('Service.Trials.XtmPlatform.Page.Form.ProductsTitle')}
            </h3>

            {hasOngoingStandaloneTrials ? (
              <div className="flex items-start gap-xs rounded border border-solid border-red p-s">
                <WarningIcon className="size-4 mt-1 shrink-0 text-destructive" />
                <div className="flex flex-col gap-xs">
                  <span>
                    {t(
                      'Service.Trials.XtmPlatform.Page.Form.OngoingTrialWarning',
                      ongoingTrialWarningParams
                    )}
                  </span>
                  <span>
                    {t(
                      'Service.Trials.XtmPlatform.Page.Form.OngoingTrialDescription'
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-xs rounded border border-solid border-alert-alert-primary p-s">
                <WarningIcon className="size-4 mt-1 shrink-0 text-alert-alert-primary" />
                <div className="flex flex-col gap-xs content-body-compact">
                  <span>
                    {t('Service.Trials.XtmPlatform.Page.Form.ProductsWarning')}
                  </span>
                  <span>
                    {t(
                      'Service.Trials.XtmPlatform.Page.Form.ProductsWarningDescription'
                    )}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-xl">
              {SELECTABLE_PRODUCTS.map((platformIdentifier) => (
                <div
                  key={platformIdentifier}
                  className="relative flex items-center gap-s">
                  <Checkbox
                    id={`product-${platformIdentifier}`}
                    checked={products.includes(platformIdentifier)}
                    onCheckedChange={(checked) =>
                      toggleProduct(platformIdentifier, checked === true)
                    }
                  />
                  <label
                    htmlFor={`product-${platformIdentifier}`}
                    className="txt-default cursor-pointer">
                    {t(`PlatformIdentifier.${platformIdentifier}`)}
                  </label>
                </div>
              ))}

              <div className="relative flex items-center gap-s">
                <Checkbox
                  id="product-xtmone"
                  checked
                  disabled
                />
                <label
                  htmlFor="product-xtmone"
                  className="content-base text-muted-foreground">
                  {t(`PlatformIdentifier.${PlatformIdentifier.Xtmone}`)}
                </label>
              </div>
            </div>
          </div>

          <FormField
            control={form.control}
            name="region"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('Service.Trials.Form.Region')}{' '}
                  <span className="text-destructive">*</span>
                </FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}>
                  <SelectTrigger className={selectTriggerClassName}>
                    <SelectValue
                      placeholder={t('Service.Trials.Form.RegionPlaceholder')}
                    />
                  </SelectTrigger>
                  <SelectContent className={selectContentClassName}>
                    {REGIONS.map((region) => (
                      <SelectItem
                        key={region.value}
                        value={region.value}>
                        {t(`Region.${region.label}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-destructive" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="job_title"
            render={({ field }) => (
              <TranslatableEnumSelectField
                field={field}
                label={t('Service.Trials.Form.JobTitle')}
                placeholder={t('Service.Trials.Form.JobTitlePlaceholder')}
                values={Object.values(DeploymentRequestJobTitle)}
                translationNamespace="DeploymentRequestJobTitle"
                selectClassName={selectLayerClassName}
              />
            )}
          />

          <FormField
            control={form.control}
            name="activity_sector"
            render={({ field }) => (
              <TranslatableEnumSelectField
                field={field}
                label={t('Service.Trials.Form.ActivitySector')}
                placeholder={t('Service.Trials.Form.ActivitySectorPlaceholder')}
                values={Object.values(DeploymentRequestActivitySector)}
                translationNamespace="DeploymentRequestActivitySector"
                selectClassName={selectLayerClassName}
              />
            )}
          />

          {fields.map((entry, index) => (
            <FormField
              key={entry.id}
              control={form.control}
              name={`use_cases_by_product.${index}.use_case`}
              render={({ field }) => (
                <TranslatableEnumSelectField
                  field={field}
                  label={t('Service.Trials.XtmPlatform.Page.Form.UseCaseFor', {
                    product: t(
                      `PlatformIdentifier.${entry.platform_identifier}`
                    ),
                  })}
                  placeholder={t('Service.Trials.Form.UseCasePlaceholder')}
                  values={
                    USE_CASES_BY_PLATFORM_IDENTIFIER[entry.platform_identifier]
                  }
                  translationNamespace="DeploymentRequestUseCase"
                  selectClassName={selectLayerClassName}
                />
              )}
            />
          ))}

          <FormField
            control={form.control}
            name="acceptTerms"
            render={({ field }) => (
              <FormItem>
                <div className="relative flex items-start gap-l">
                  <Checkbox
                    id="acceptTerms"
                    className="mt-1"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <label
                    htmlFor="acceptTerms"
                    className="txt-default cursor-pointer text-muted-foreground">
                    {t('Service.Trials.Form.MSSAAgreement')}{' '}
                    <Link
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-primary"
                      href="https://filigran.io/mssa/">
                      {t('Service.Trials.Form.MSSA')}
                    </Link>{' '}
                    <span className="text-destructive">*</span>
                  </label>
                </div>
                <FormMessage className="text-destructive" />
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!hasSelectableProduct}>
              {t('Service.Trials.XtmPlatform.Page.Form.Submit')}
            </Button>
          </div>
        </form>
      </Form>

      <AlertDialogComponent
        AlertTitle=""
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        actionButtonText={t('Utils.Confirm')}
        variantName="destructive"
        onClickContinue={onConfirmOngoingTrial}>
        <div className="flex items-start gap-xs rounded border border-solid border-red p-s">
          <WarningIcon className="size-4 mt-1 shrink-0 text-destructive" />
          <div className="flex flex-col gap-xs">
            <span>
              {t(
                'Service.Trials.XtmPlatform.Page.Form.OngoingTrialWarning',
                ongoingTrialWarningParams
              )}
            </span>
            <span>
              {t(
                'Service.Trials.XtmPlatform.Page.Form.OngoingTrialDescription'
              )}
            </span>
          </div>
        </div>
      </AlertDialogComponent>
    </div>
  );
};
