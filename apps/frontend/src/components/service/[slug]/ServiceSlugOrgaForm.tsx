import {
  getOrganizations,
  useUnsubscribedOrganizations,
} from '@/components/organization/Organization.service';
import {
  AddSubscriptionInServiceMutation,
  UpdateSubscriptionInServiceMutation,
} from '@/components/subcription/subscription.graphql';
import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { subscriptionInServiceCreateMutation } from '@generated/subscriptionInServiceCreateMutation.graphql';
import { subscription_fragment$data } from '@generated/subscription_fragment.graphql';
import { useSubscriptionDefaultValues } from './use-subscription-default-values';

import { useTranslate } from '@/hooks/use-translate';
import { DEBOUNCE_TIME } from '@/utils/constant';
import {
  Button,
  Checkbox,
  DatePicker,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  MultiSelectFormField,
  SheetFooter,
  useToast,
} from '@filigran/ui';
import { serviceInstanceForSubscriptions_fragment$data } from '@generated/serviceInstanceForSubscriptions_fragment.graphql';
import { subscriptionInServiceUpdateMutation } from '@generated/subscriptionInServiceUpdateMutation.graphql';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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

export const ServiceSlugOrgaForm = ({
  serviceInstance,
  subscriptions,
  subscriptionToEdit,
  subscriptionConnectionId,
}: ServiceSlugAddOrgaFormSheetProps) => {
  const { handleCloseSheet, setIsDirty, setOpenSheet } = useDialogContext();
  const t = useTranslate();
  const { toast } = useToast();
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

  useEffect(() => {
    setIsDirty(form.formState.isDirty);
  }, [form.formState.isDirty, setIsDirty]);

  const onSubmit = (inputValue: z.infer<typeof formSchema>) => {
    const selectedOrganizationName =
      inputValue.organization_id
        .map(
          (organizationId) =>
            organizationsData.organizations.edges.find(
              ({ node }) => node.id === organizationId
            )?.node.name
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
          toast({
            title: t('Utils.Success'),
            description: t('ServiceActions.OrganizationAdded', {
              name: selectedOrganizationName,
              serviceName: serviceInstance.name,
            }),
          });
          setOpenSheet(false);
        },
        onError: (error: Error) => {
          toast({
            variant: 'destructive',
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
        toast({
          title: t('Utils.Success'),
          description: t('ServiceActions.OrganizationAdded', {
            name: selectedOrganizationName,
            serviceName: serviceInstance.name,
          }),
        });
        setOpenSheet(false);
      },
      onError: (error: Error) => {
        toast({
          variant: 'destructive',
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('OrganizationInServiceAction.Organization')}
                  </FormLabel>
                  <FormControl>
                    <MultiSelectFormField
                      popoverContentClassName="bg-elevation-background-layer-3"
                      shouldFilter={false}
                      options={organizations}
                      keyValue="id"
                      keyLabel="name"
                      value={field.value}
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                      onInputChange={handleOrganizationsInputChange}
                      noResultString={t('Utils.NotFound')}
                      placeholder={t(
                        'OrganizationInServiceAction.SelectOrganization'
                      )}
                      variant="inverted"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="border border-primary rounded-lg p-l">
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
                    <FormItem className="flex flex-row items-center">
                      <Checkbox
                        className="mt-xs"
                        checked={field.value.includes(id)}
                        onCheckedChange={(checked) => {
                          const newValue = checked
                            ? [...field.value, id]
                            : field.value.filter(
                                (value: string) => value !== id
                              );
                          field.onChange(newValue);
                        }}
                        id={id}
                      />

                      <label
                        htmlFor={id}
                        className="txt-sub-content cursor-pointer">
                        {t('Service.Form.CapabilityAccessLabel', {
                          name: name ?? '',
                          description: description ?? '',
                        })}
                      </label>
                    </FormItem>
                  )}
                />
              ))}
          </div>

          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <>
                <FormItem>
                  <FormLabel>
                    {t('OrganizationInServiceAction.StartDate')}
                  </FormLabel>
                  <DatePicker
                    popoverContentClassName="bg-elevation-background-layer-3"
                    date={field.value}
                    setDate={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              </>
            )}
          />

          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <>
                <FormItem>
                  <FormLabel>
                    {t('OrganizationInServiceAction.EndDate')}
                  </FormLabel>
                  <DatePicker
                    popoverContentClassName="bg-elevation-background-layer-3"
                    date={field.value}
                    setDate={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              </>
            )}
          />

          <SheetFooter className="pt-2">
            <Button
              variant="secondary"
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
