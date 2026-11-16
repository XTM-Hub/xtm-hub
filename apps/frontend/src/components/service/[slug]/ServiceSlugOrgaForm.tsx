import {
  useOrganizations,
  useUnsubscribedOrganizations,
} from '@/components/organization/Organization.service';
import { invalidateSubscriptionQueries } from '@/components/subcription/subscription.invalidation';
import { AppCombobox } from '@/components/ui/AppCombobox';
import { SheetFooter } from '@/components/ui/sheet';
import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  fromDatePickerChange,
  getDatePickerLabels,
  toDatePickerValue,
} from '@/utils/design-system/date-picker';
import {
  SubscriptionItemFragment,
  useCreateSubscriptionsMutation,
  useUpdateSubscriptionMutation,
} from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';
import { useSubscriptionDefaultValues } from './use-subscription-default-values';

import { Form, FormField, FormLabel } from '@/components/ui/form';
import { useKeepSelectedOptions } from '@/hooks/use-keep-selected-options';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { DEBOUNCE_TIME } from '@/utils/constant';
import { toComboboxOptionIds } from '@/utils/design-system/combobox';
import { Button, Checkbox, DatePicker } from '@filigran/design-system';
import { serviceInstanceForSubscriptions_fragment$data } from '@generated/serviceInstanceForSubscriptions_fragment.graphql';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useDebounceCallback } from 'usehooks-ts';
import { z } from 'zod';

interface ServiceSlugAddOrgaFormSheetProps {
  serviceInstance: serviceInstanceForSubscriptions_fragment$data;
  subscriptions: SubscriptionItemFragment[];
  subscriptionToEdit?: SubscriptionItemFragment;
}

const formSchema = z.object({
  organization_id: z.array(z.string()).min(1, {
    error: 'You must choose at least one organization.',
  }),
  capability_ids: z.array(z.string()),
  start_date: z.coerce.date<Date>(),
  end_date: z.coerce.date<Date>().optional(),
});

const getOrganizationId = ({ id }: { id: string }) => id;

export const ServiceSlugOrgaForm = ({
  serviceInstance,
  subscriptions,
  subscriptionToEdit,
}: ServiceSlugAddOrgaFormSheetProps) => {
  const { handleCloseSheet, setIsDirty, setOpenSheet } = useDialogContext();
  const t = useTranslate();
  const locale = useLocale();
  const startDateLabel = t('OrganizationInServiceAction.StartDate');
  const endDateLabel = t('OrganizationInServiceAction.EndDate');
  const [organizationSearchTerm, setOrganizationSearchTerm] = useState('');
  const {
    organizations: searchedOrganizations,
    isLoading: isLoadingOrganizations,
    isError: isOrganizationsError,
    isPlaceholderData: isSearchingOrganizations,
  } = useOrganizations({ searchTerm: organizationSearchTerm });
  const organizations = useUnsubscribedOrganizations(
    searchedOrganizations,
    subscriptions,
    subscriptionToEdit
  );

  const defaultValues = useSubscriptionDefaultValues(subscriptionToEdit);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const selectedOrganizationIds = useWatch({
    control: form.control,
    name: 'organization_id',
  });
  const keptOrganizations = useKeepSelectedOptions({
    options: organizations,
    value: selectedOrganizationIds,
    getId: getOrganizationId,
  });
  const organizationOptionIds = useMemo(
    () =>
      toComboboxOptionIds(
        keptOrganizations,
        getOrganizationId,
        (organization) => organization.name
      ),
    [keptOrganizations]
  );

  const queryClient = useQueryClient();

  const getSelectedOrganizationNames = (organizationIds: string[]) =>
    organizationIds
      .map(
        (organizationId) =>
          keptOrganizations.find(({ id }) => id === organizationId)?.name
      )
      .filter((name): name is string => Boolean(name))
      .join(', ');

  const onSubscriptionSaved = async (organizationName: string) => {
    await invalidateSubscriptionQueries(queryClient);
    showSnackbar({
      severity: 'success',
      title: t('Utils.Success'),
      description: t('ServiceActions.OrganizationAdded', {
        name: organizationName,
        serviceName: serviceInstance.name,
      }),
    });
    setOpenSheet(false);
  };

  const onSubscriptionError = (error: unknown) => {
    const errorMessage =
      error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    showSnackbar({
      severity: 'error',
      title: t('Utils.Error'),
      description: <>{t(`Error.Server.${errorMessage}`)}</>,
    });
  };

  const { mutate: createSubscriptions, isPending: isCreating } =
    useCreateSubscriptionsMutation(portalGraphqlClient, {
      onSuccess: (_data, { input }) =>
        onSubscriptionSaved(
          getSelectedOrganizationNames(input.organization_id)
        ),
      onError: onSubscriptionError,
    });
  const { mutate: updateSubscription, isPending: isUpdating } =
    useUpdateSubscriptionMutation(portalGraphqlClient, {
      onSuccess: () =>
        onSubscriptionSaved(subscriptionToEdit?.organization.name ?? ''),
      onError: onSubscriptionError,
    });

  useEffect(() => {
    setIsDirty(form.formState.isDirty);
  }, [form.formState.isDirty, setIsDirty]);

  const onSubmit = (inputValue: z.infer<typeof formSchema>) => {
    if (subscriptionToEdit) {
      updateSubscription({
        subscription_id: subscriptionToEdit.id,
        input: {
          capability_ids: inputValue.capability_ids,
          start_date: inputValue.start_date,
          end_date: inputValue.end_date,
        },
      });

      return;
    }
    createSubscriptions({
      input: {
        service_instance_id: serviceInstance.id,
        organization_id: inputValue.organization_id,
        capability_ids: inputValue.capability_ids,
        start_date: inputValue.start_date,
        end_date: inputValue.end_date,
      },
    });
  };

  const handleOrganizationsInputChange = useDebounceCallback(
    setOrganizationSearchTerm,
    DEBOUNCE_TIME
  );

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full space-y-6">
          {!subscriptionToEdit && (
            <FormField
              control={form.control}
              name="organization_id"
              render={({ field, fieldState }) => (
                <AppCombobox
                  formField
                  multiple
                  label={t('OrganizationInServiceAction.Organization')}
                  placeholder={t(
                    'OrganizationInServiceAction.SelectOrganization'
                  )}
                  error={
                    fieldState.error?.message ??
                    (isOrganizationsError
                      ? t('OrganizationActions.LoadOrganizationsError')
                      : undefined)
                  }
                  loading={isLoadingOrganizations || isSearchingOrganizations}
                  options={organizationOptionIds.ids}
                  value={field.value ?? []}
                  onValueChange={field.onChange}
                  onInputChange={(text, meta) => {
                    if (meta.cause !== 'select')
                      handleOrganizationsInputChange(text);
                  }}
                  filterOptions={(options) => options}
                  getOptionLabel={organizationOptionIds.getOptionLabel}
                />
              )}
            />
          )}

          <div className="border border-filigran-brand-primary rounded p-4">
            <FormLabel>{t('OrganizationInServiceAction.SelectCapa')}</FormLabel>
            <p className="content-compact italic">
              {t('OrganizationInServiceAction.SelectCapaDescription')}
            </p>
            {serviceInstance.service_definition?.service_capability
              ?.filter((sc) => !!sc)
              ?.map(({ id, name, description }) => (
                <FormField
                  key={id}
                  control={form.control}
                  name="capability_ids"
                  render={({ field }) => (
                    <Checkbox
                      label={t('Service.Form.CapabilityAccessLabel', {
                        name: name ?? '',
                        description: description ?? '',
                      })}
                      checked={field.value.includes(id)}
                      onCheckedChange={(checked) => {
                        const newValue = checked
                          ? [...field.value, id]
                          : field.value.filter((value: string) => value !== id);
                        field.onChange(newValue);
                      }}
                    />
                  )}
                />
              ))}
          </div>

          <FormField
            control={form.control}
            name="start_date"
            render={({ field, fieldState }) => (
              <DatePicker
                {...getDatePickerLabels(t, startDateLabel)}
                label={startDateLabel}
                locale={locale}
                value={toDatePickerValue(field.value)}
                onChange={(date, context) =>
                  field.onChange(fromDatePickerChange(date, context))
                }
                error={fieldState.error?.message}
              />
            )}
          />

          <FormField
            control={form.control}
            name="end_date"
            render={({ field, fieldState }) => (
              <DatePicker
                {...getDatePickerLabels(t, endDateLabel)}
                label={endDateLabel}
                locale={locale}
                value={toDatePickerValue(field.value)}
                onChange={(date, context) =>
                  field.onChange(fromDatePickerChange(date, context))
                }
                error={fieldState.error?.message}
                clearable
              />
            )}
          />

          <SheetFooter className="pt-2">
            <Button
              {...analyticsId('admin_form_cancel')}
              priority="secondary"
              type="button"
              onClick={(e) => handleCloseSheet(e)}>
              {t('Utils.Cancel')}
            </Button>
            <Button
              {...analyticsId('admin_subscription_submit')}
              disabled={!form.formState.isValid || isCreating || isUpdating}
              type="submit">
              {t('Utils.Validate')}
            </Button>
          </SheetFooter>
        </form>
      </Form>
    </>
  );
};
