import {
  getOrganizations,
  useUnsubscribedOrganizations,
} from '@/components/organization/Organization.service';
import {
  AddSubscriptionInServiceMutation,
  UpdateSubscriptionInServiceMutation,
} from '@/components/subcription/subscription.graphql';
import { AppCombobox } from '@/components/ui/AppCombobox';
import { SheetFooter } from '@/components/ui/sheet';
import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import {
  fromDatePickerChange,
  getDatePickerLabels,
  toDatePickerValue,
} from '@/utils/design-system/date-picker';
import { subscription_fragment$data } from '@generated/subscription_fragment.graphql';
import { subscriptionInServiceCreateMutation } from '@generated/subscriptionInServiceCreateMutation.graphql';
import { useSubscriptionDefaultValues } from './use-subscription-default-values';

import { Form, FormField, FormLabel } from '@/components/ui/form';
import { useKeepSelectedOptions } from '@/hooks/use-keep-selected-options';
import { useTranslate } from '@/hooks/use-translate';
import { DEBOUNCE_TIME } from '@/utils/constant';
import { toComboboxOptionIds } from '@/utils/design-system/combobox';
import { Button, Checkbox, DatePicker } from '@filigran/design-system';
import { serviceInstanceForSubscriptions_fragment$data } from '@generated/serviceInstanceForSubscriptions_fragment.graphql';
import { subscriptionInServiceUpdateMutation } from '@generated/subscriptionInServiceUpdateMutation.graphql';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale } from 'next-intl';
import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useMutation } from 'react-relay';
import { useDebounceCallback } from 'usehooks-ts';
import { z } from 'zod';

interface ServiceSlugAddOrgaFormSheetProps {
  serviceInstance: serviceInstanceForSubscriptions_fragment$data;
  subscriptions: subscription_fragment$data[];
  subscriptionToEdit?: subscription_fragment$data;
  subscriptionConnectionId: string;
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
  subscriptionConnectionId,
}: ServiceSlugAddOrgaFormSheetProps) => {
  const { handleCloseSheet, setIsDirty, setOpenSheet } = useDialogContext();
  const t = useTranslate();
  const locale = useLocale();
  const startDateLabel = t('OrganizationInServiceAction.StartDate');
  const endDateLabel = t('OrganizationInServiceAction.EndDate');
  const { organizationsData, refetch } = getOrganizations();
  const organizations = useUnsubscribedOrganizations(
    organizationsData,
    subscriptions,
    subscriptionToEdit
  );

  const [commitSubscriptionCreateMutation] =
    useMutation<subscriptionInServiceCreateMutation>(
      AddSubscriptionInServiceMutation
    );
  const [commitSubscriptionUpdateMutation] =
    useMutation<subscriptionInServiceUpdateMutation>(
      UpdateSubscriptionInServiceMutation
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

  useEffect(() => {
    setIsDirty(form.formState.isDirty);
  }, [form.formState.isDirty, setIsDirty]);

  const onSubmit = (inputValue: z.infer<typeof formSchema>) => {
    const selectedOrganizationName =
      inputValue.organization_id
        .map(
          (organizationId) =>
            keptOrganizations.find(({ id }) => id === organizationId)?.name
        )
        .filter((name): name is string => Boolean(name))
        .join(', ') ||
      subscriptionToEdit?.organization.name ||
      '';

    const input = {
      service_instance_id: serviceInstance.id,
      organization_id: inputValue.organization_id,
      capability_ids: inputValue.capability_ids,
      start_date: inputValue.start_date,
      end_date: inputValue.end_date,
    };
    if (subscriptionToEdit) {
      commitSubscriptionUpdateMutation({
        variables: {
          subscription_id: subscriptionToEdit.id,
          input: {
            capability_ids: inputValue.capability_ids,
            start_date: inputValue.start_date,
            end_date: inputValue.end_date,
          },
        },
        onCompleted: (_response) => {
          showSnackbar({
            severity: 'success',
            title: t('Utils.Success'),
            description: t('ServiceActions.OrganizationAdded', {
              name: selectedOrganizationName,
              serviceName: serviceInstance.name,
            }),
          });
          setOpenSheet(false);
        },
        onError: (error: Error) => {
          showSnackbar({
            severity: 'error',
            title: t('Utils.Error'),
            description: <>{t(`Error.Server.${error.message}`)}</>,
          });
        },
      });

      return;
    }
    commitSubscriptionCreateMutation({
      variables: {
        input,
        connections: [subscriptionConnectionId],
      },
      onCompleted: (_response) => {
        showSnackbar({
          severity: 'success',
          title: t('Utils.Success'),
          description: t('ServiceActions.OrganizationAdded', {
            name: selectedOrganizationName,
            serviceName: serviceInstance.name,
          }),
        });
        setOpenSheet(false);
      },
      onError: (error: Error) => {
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: <>{t(`Error.Server.${error.message}`)}</>,
        });
      },
    });
  };

  const handleOrganizationsInputChange = useDebounceCallback(
    (search: string) => {
      refetch({
        searchTerm: search,
      });
    },
    DEBOUNCE_TIME
  );

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full space-y-xl">
          {!subscriptionToEdit && (
            <FormField
              control={form.control}
              name="organization_id"
              render={({ field, fieldState }) => (
                <AppCombobox
                  multiple
                  label={t('OrganizationInServiceAction.Organization')}
                  placeholder={t(
                    'OrganizationInServiceAction.SelectOrganization'
                  )}
                  error={fieldState.error?.message}
                  options={organizationOptionIds.ids}
                  value={field.value ?? []}
                  onValueChange={field.onChange}
                  onInputChange={(text, meta) => {
                    if (meta.cause !== 'select')
                      handleOrganizationsInputChange(text);
                  }}
                  filterOptions={(options) => options}
                  getOptionLabel={organizationOptionIds.getOptionLabel}
                  contentClassName="layer-2"
                />
              )}
            />
          )}

          <div className="border border-primary rounded p-l">
            <FormLabel>{t('OrganizationInServiceAction.SelectCapa')}</FormLabel>
            <p className="txt-sub-content italic">
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
              priority="secondary"
              type="button"
              onClick={(e) => handleCloseSheet(e)}>
              {t('Utils.Cancel')}
            </Button>
            <Button
              disabled={!form.formState.isValid}
              type="submit">
              {t('Utils.Validate')}
            </Button>
          </SheetFooter>
        </form>
      </Form>
    </>
  );
};
