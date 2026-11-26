import { AppCombobox } from '@/components/ui/AppCombobox';
import { DEBOUNCE_TIME } from '@/utils/constant';
import {
  FilterKey,
  ServiceRestriction,
  SubscriptionByIdQuery,
  useAddUserServiceMutation,
  useEditUserServiceMutation,
  type UserServiceItemFragment,
  UsersQueryVariables,
  useUsersQuery,
} from '@graphql/generated';
import { useContext, useEffect, useMemo, useState } from 'react';

import { useUserListLocalstorage } from '@/components/admin/user/user-list-localstorage';
import Loader from '@/components/Loader';
import { PortalContext } from '@/components/me/AppPortalContext';
import { Form, FormField } from '@/components/ui/form';
import { SheetFooter } from '@/components/ui/sheet';
import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useKeepSelectedOptions } from '@/hooks/use-keep-selected-options';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { toComboboxOptionIds } from '@/utils/design-system/combobox';
import { invalidateUserServiceQueries } from '@/utils/query-invalidation/user-service.invalidation';
import {
  Button,
  Checkbox,
  Paper,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { useDebounceCallback } from 'usehooks-ts';
import { z } from 'zod';

interface UserServiceFormProps {
  userService?: UserServiceItemFragment;
  subscription: SubscriptionByIdQuery;
}

const getUserOptionValue = ({ value }: { value: string }) => value;

export const UserServiceForm = ({
  userService,
  subscription,
}: UserServiceFormProps) => {
  const { handleCloseSheet, setIsDirty, setOpenSheet } = useDialogContext();
  const { me } = useContext(PortalContext);

  const queryClient = useQueryClient();
  const t = useTranslate();
  const { mutate: editUserService, isPending: isEditInFlight } =
    useEditUserServiceMutation(portalGraphqlClient, {
      onSuccess: async () => {
        await invalidateUserServiceQueries(queryClient);
        showSnackbar({
          severity: 'success',
          title: t('Utils.Success'),
          description: t('ServiceActions.UserCapabilitiesModified', {
            email: userService!.user!.email,
          }),
        });
        setOpenSheet(false);
      },
      onError: (error: Error) => {
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: t(`Error.Server.${error.message}`),
        });
      },
    });
  const { mutate: addUserService, isPending: isCreateInFlight } =
    useAddUserServiceMutation(portalGraphqlClient, {
      onSuccess: async (_data, { input }) => {
        await invalidateUserServiceQueries(queryClient);
        showSnackbar({
          severity: 'success',
          title: t('Utils.Success'),
          description: t('ServiceActions.UserServiceAdded', {
            email: input.email.join(', '),
            serviceName: subscription.subscriptionById!.service_instance!.name,
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
  const isUserCreation = !userService?.id;

  const organizationId = subscription.subscriptionById?.organization?.id;
  const genericCapabilities = [
    {
      id: ServiceRestriction.ManageAccess as string,
      name: ServiceRestriction.ManageAccess as string,
      description: ServiceRestriction.ManageAccess as string,
    },
  ];

  const capabilitiesData = [
    ...(subscription.subscriptionById?.service_instance?.service_definition
      ?.service_capability ?? []),
    ...genericCapabilities,
  ];

  const capabilitiesFormSchema = z.object({
    capabilities: z.array(z.string()),
    organizationId: z.string(),
  });

  const extendedSchema = capabilitiesFormSchema.extend({
    email: z.array(z.string()).min(1, {
      error: 'Please provide at least one email.',
    }),
  });

  const currentCapabilities = useMemo(() => {
    if (isUserCreation) {
      return [];
    }

    return userService?.user_service_capability
      ?.map((capability) => {
        return (
          capability?.generic_service_capability?.name ||
          capability?.subscription_capability?.service_capability?.id
        );
      })
      .filter((id) => id !== undefined);
  }, [isUserCreation, userService]);

  const defaultValues = useMemo(() => {
    return {
      email: [],
      capabilities: currentCapabilities,
      organizationId: organizationId,
    };
  }, [organizationId, currentCapabilities]);

  const capabilitiesForm = useForm<z.infer<typeof capabilitiesFormSchema>>({
    resolver: zodResolver(capabilitiesFormSchema),
    defaultValues: {
      capabilities: currentCapabilities,
      organizationId: organizationId,
    },
  });

  const extendedForm = useForm<z.infer<typeof extendedSchema>>({
    resolver: zodResolver(extendedSchema),
    defaultValues: {
      email: [],
      capabilities: currentCapabilities,
      organizationId: organizationId,
    },
  });

  const form = userService?.id ? capabilitiesForm : extendedForm;

  useEffect(() => {
    form.reset(defaultValues);
  }, [subscription.subscriptionById?.id, defaultValues, form]);

  useEffect(() => {
    setIsDirty(form.formState.isDirty);
  }, [form.formState.isDirty, setIsDirty]);

  const onSubmitCapabilitiesSchema = (
    values: z.infer<typeof capabilitiesFormSchema>
  ) => {
    if (!userService || !userService.user) {
      return;
    }
    const editCapaValues = {
      capabilities: values.capabilities,
    };
    editUserService({
      input: {
        userServiceId: userService.id,
        ...editCapaValues,
      },
      service_instance_id: subscription.subscriptionById!.service_instance!.id,
    });
  };

  const onSubmitExtendSchema = (values: z.infer<typeof extendedSchema>) => {
    if (
      !subscription.subscriptionById ||
      !subscription.subscriptionById.service_instance
    ) {
      return;
    }
    addUserService({
      input: {
        email: values.email,
        capabilities: values.capabilities,
        subscription_id: subscription.subscriptionById.id,
      },
      service_instance_id: subscription.subscriptionById.service_instance.id,
    });
  };

  const { pageSize, orderMode, orderBy } = useUserListLocalstorage();

  const isCapabilityDisabled = (id: string) => {
    if (id === ServiceRestriction.ManageAccess) {
      return false;
    }

    return !subscription.subscriptionById?.subscription_capability?.some(
      (subscriptionCapa) => id === subscriptionCapa?.service_capability?.id
    );
  };

  const [usersSearchTerm, setUsersSearchTerm] = useState<string | null>(null);
  const usersVariables = useMemo<UsersQueryVariables>(
    () => ({
      first: pageSize,
      orderMode,
      orderBy,
      searchTerm: usersSearchTerm,
      filters: organizationId
        ? [{ key: FilterKey.OrganizationId, value: [organizationId] }]
        : null,
    }),
    [pageSize, orderMode, orderBy, usersSearchTerm, organizationId]
  );
  const { data, isLoading, isPlaceholderData } = useUsersQuery(
    portalGraphqlClient,
    usersVariables,
    {
      // A search keeps the previous data, so the field never goes back to empty.
      placeholderData: keepPreviousData,
      // Like Relay, a failed load reaches the error page; a failed background
      // refetch keeps the options shown.
      throwOnError: (_error, query) => query.state.data === undefined,
    }
  );
  const handleUsersInputChange = useDebounceCallback((search: string) => {
    setUsersSearchTerm(search);
  }, DEBOUNCE_TIME);

  const usersOptions = useMemo(
    () =>
      data?.users.edges
        .filter(({ node }) => node.id !== me?.id)
        .map(({ node }) => ({
          label: node.email,
          value: node.email,
        })) ?? [],
    [data, me?.id]
  );
  const selectedEmails = useWatch({
    control: extendedForm.control,
    name: 'email',
  });
  const keptUsersOptions = useKeepSelectedOptions({
    options: usersOptions,
    value: selectedEmails,
    getId: getUserOptionValue,
  });
  const usersOptionIds = useMemo(
    () =>
      toComboboxOptionIds(
        keptUsersOptions,
        getUserOptionValue,
        (option) => option.label
      ),
    [keptUsersOptions]
  );

  // The form waits for the users, as it did when the Relay query suspended it.
  if (!data) {
    return <Loader />;
  }

  return (
    <Form {...(form as typeof extendedForm)}>
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          userService?.id
            ? capabilitiesForm.handleSubmit(onSubmitCapabilitiesSchema)(e)
            : extendedForm.handleSubmit(onSubmitExtendSchema)(e);
        }}>
        {!userService?.id && (
          <>
            <FormField
              control={extendedForm.control}
              name="email"
              render={({ field, fieldState }) => (
                <AppCombobox
                  formField
                  multiple
                  label={t('InviteUserServiceForm.Email')}
                  placeholder={t('Service.Management.Email')}
                  error={fieldState.error?.message}
                  options={usersOptionIds.ids}
                  value={field.value ?? []}
                  onValueChange={field.onChange}
                  onInputChange={(text, meta) => {
                    if (meta.cause !== 'select') handleUsersInputChange(text);
                  }}
                  filterOptions={(options) => options}
                  getOptionLabel={usersOptionIds.getOptionLabel}
                  loading={isLoading || isPlaceholderData}
                />
              )}
            />
          </>
        )}

        <Paper
          as="section"
          elevation={3}
          className="flex flex-col gap-2"
          padding={16}
          title={t('OrganizationInServiceAction.SelectCapa')}>
          <p className="content-compact italic">
            {t('InviteUserServiceForm.Description')}
          </p>
          {capabilitiesData.map((capability) => (
            <FormField
              key={capability!.id}
              control={(form as typeof capabilitiesForm).control}
              name="capabilities"
              render={({ field }) => (
                <TooltipProvider>
                  <Checkbox
                    {...field}
                    disabled={isCapabilityDisabled(capability!.id)}
                    checked={(field.value as string[]).includes(capability!.id)}
                    onCheckedChange={(checked) => {
                      const newValue = checked
                        ? Array.from(
                            new Set([...(field.value || []), capability!.id])
                          )
                        : (field.value || []).filter(
                            (value) => value !== capability!.id
                          );
                      field.onChange(newValue);
                    }}
                    label={
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            {capability!.name ===
                            ServiceRestriction.ManageAccess
                              ? t('Service.Form.ManageAccessCapabilityLabel')
                              : t('Service.Form.CapabilityAccessLabel', {
                                  name: capability!.name ?? '',
                                  description: capability!.description ?? '',
                                })}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {isCapabilityDisabled(capability!.id)
                              ? t('InviteUserServiceForm.DisabledCapability')
                              : t('InviteUserServiceForm.GrantCapability')}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    }
                  />
                </TooltipProvider>
              )}
            />
          ))}
        </Paper>

        <SheetFooter className="pt-2">
          <Button
            {...analyticsId('subscription_user_cancel')}
            priority="secondary"
            type="button"
            onClick={(e) => handleCloseSheet(e)}>
            {t('Utils.Cancel')}
          </Button>
          <Button
            {...analyticsId('subscription_user_submit')}
            type="submit"
            loading={isEditInFlight || isCreateInFlight}>
            {t('Utils.Validate')}
          </Button>
        </SheetFooter>
      </form>
    </Form>
  );
};
