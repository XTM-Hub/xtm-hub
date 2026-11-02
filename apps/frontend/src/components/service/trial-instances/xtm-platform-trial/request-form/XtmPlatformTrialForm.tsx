import { PortalContext } from '@/components/me/AppPortalContext';
import {
  PRODUCTS_WITH_USE_CASE,
  REGIONS,
  REGIONS_VALUES,
  USE_CASES_BY_PLATFORM_IDENTIFIER,
} from '@/components/service/trial-instances/form-constants';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { SelectField } from '@/components/ui/SelectField';
import { TranslatableEnumSelectField } from '@/components/ui/TranslatableEnumSelectField';
import { useTranslate } from '@/hooks/use-translate';
import {
  FiligranWebsiteUtmCampaign,
  withFiligranWebsiteUtm,
} from '@/utils/filigran-website-utm';
import { Button, Checkbox } from '@filigran/design-system';
import {
  DeploymentRequestActivitySector,
  DeploymentRequestJobTitle,
  DeploymentRequestUseCase,
  PlatformIdentifier,
} from '@graphql/generated';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { ReactNode, useContext, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const buildXtmPlatformTrialFormSchema = (t: (key: string) => string) =>
  z.object({
    region: z.enum(REGIONS_VALUES),
    job_title: z.enum(DeploymentRequestJobTitle),
    activity_sector: z.enum(DeploymentRequestActivitySector),
    use_cases_by_product: z.array(
      z.object({
        platform_identifier: z.enum(PlatformIdentifier),
        use_case: z.enum(DeploymentRequestUseCase, {
          error: t('Service.Trials.Form.Error.UseCase'),
        }),
      })
    ),
    acceptTerms: z.boolean().refine((value) => value === true, {
      error: t('Service.Trials.Form.Error.AcceptTerms'),
    }),
  });

export const xtmPlatformTrialFormSchema = buildXtmPlatformTrialFormSchema(
  (key) => key
);

interface XtmPlatformTrialFormProps {
  handleSubmit: (values: z.infer<typeof xtmPlatformTrialFormSchema>) => void;
  isSubmitting?: boolean;
}

export const XtmPlatformTrialForm = ({
  handleSubmit,
  isSubmitting = false,
}: XtmPlatformTrialFormProps) => {
  const t = useTranslate();
  const { me } = useContext(PortalContext);

  const renderMssaLink = (chunks: ReactNode) => (
    <Link
      target="_blank"
      rel="noopener noreferrer"
      className="underline text-filigran-brand-primary"
      href={withFiligranWebsiteUtm('https://filigran.io/mssa', {
        campaign: FiligranWebsiteUtmCampaign.OTHER,
        content: 'trial_form_mssa',
      })}>
      {chunks}
    </Link>
  );
  const renderAiTermsLink = (chunks: ReactNode) => (
    <Link
      target="_blank"
      rel="noopener noreferrer"
      className="underline text-filigran-brand-primary"
      href={withFiligranWebsiteUtm('https://filigran.io/ai-terms', {
        campaign: FiligranWebsiteUtmCampaign.OTHER,
        content: 'trial_form_ai_terms',
      })}>
      {chunks}
    </Link>
  );

  const formSchema = useMemo(() => buildXtmPlatformTrialFormSchema(t), [t]);

  const form = useForm<z.infer<typeof xtmPlatformTrialFormSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      use_cases_by_product: PRODUCTS_WITH_USE_CASE.map(
        (platformIdentifier) => ({
          platform_identifier: platformIdentifier,
          use_case: undefined,
        })
      ),
      acceptTerms: false,
    },
  });

  return (
    <div className="flex w-full flex-col gap-6 rounded layer-2 bg-elevation-default p-6">
      <div className="flex items-center gap-4">
        <span className="text-content-base text-default-secondary">
          {t('Service.Trials.Form.AssociatedEmail')}
        </span>
        <span>{me?.email}</span>
      </div>

      <Form {...form}>
        <form
          className="flex w-full flex-col gap-4"
          onSubmit={form.handleSubmit(handleSubmit)}>
          <FormField
            control={form.control}
            name="region"
            render={({ field, fieldState }) => (
              <SelectField
                label={t('Service.Trials.Form.Region')}
                required
                placeholder={t('Service.Trials.Form.RegionPlaceholder')}
                options={REGIONS.map((region) => ({
                  value: region.value,
                  label: t(`Region.${region.label}`),
                }))}
                value={field.value}
                onValueChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />

          <FormField
            control={form.control}
            name="job_title"
            render={({ field, fieldState }) => (
              <TranslatableEnumSelectField
                field={field}
                label={t('Service.Trials.Form.JobTitle')}
                placeholder={t('Service.Trials.Form.JobTitlePlaceholder')}
                values={Object.values(DeploymentRequestJobTitle)}
                translationNamespace="DeploymentRequestJobTitle"
                error={fieldState.error?.message}
              />
            )}
          />

          <FormField
            control={form.control}
            name="activity_sector"
            render={({ field, fieldState }) => (
              <TranslatableEnumSelectField
                field={field}
                label={t('Service.Trials.Form.ActivitySector')}
                placeholder={t('Service.Trials.Form.ActivitySectorPlaceholder')}
                values={Object.values(DeploymentRequestActivitySector)}
                translationNamespace="DeploymentRequestActivitySector"
                error={fieldState.error?.message}
              />
            )}
          />

          {PRODUCTS_WITH_USE_CASE.map((platformIdentifier, index) => (
            <FormField
              key={platformIdentifier}
              control={form.control}
              name={`use_cases_by_product.${index}.use_case`}
              render={({ field, fieldState }) => (
                <TranslatableEnumSelectField
                  field={field}
                  label={t('Service.Trials.XtmPlatform.Page.Form.UseCaseFor', {
                    product: t(`PlatformIdentifier.${platformIdentifier}`),
                  })}
                  placeholder={t('Service.Trials.Form.UseCasePlaceholder')}
                  values={USE_CASES_BY_PLATFORM_IDENTIFIER[platformIdentifier]}
                  translationNamespace="DeploymentRequestUseCase"
                  error={fieldState.error?.message}
                />
              )}
            />
          ))}

          <FormField
            control={form.control}
            name="acceptTerms"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormControl>
                  <Checkbox
                    id="acceptTerms"
                    label={
                      <>
                        {t.rich('Service.Trials.Form.TermsAgreement', {
                          mssa: renderMssaLink,
                          aiterms: renderAiTermsLink,
                        })}{' '}
                        <span className="text-input-required">*</span>
                      </>
                    }
                    error={Boolean(fieldState.error)}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <Button
              type="submit"
              loading={isSubmitting}>
              {t('Service.Trials.XtmPlatform.Page.Form.Submit')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
