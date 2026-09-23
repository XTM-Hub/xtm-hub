import { UserFragment } from '@/components/admin/user/UserList';
import { DEBOUNCE_TIME } from '@/utils/constant';
import { ServiceRestriction } from '@graphql/generated';
import { useContext, useEffect, useMemo } from 'react';

import { useUserListLocalstorage } from '@/components/admin/user/user-list-localstorage';
import { PortalContext } from '@/components/me/AppPortalContext';
import {
  UserServiceCreateMutation,
  UserServiceEditMutation,
} from '@/components/service/user_service.graphql';
import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import { useUsersList } from '@/hooks/use-users-list';
import {
  Button,
  Checkbox,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  SheetFooter,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useToast,
} from '@filigran/ui';
import { MultiSelectFormField } from '@filigran/ui/clients';
import { subscriptionByIdQuery$data } from '@generated/subscriptionByIdQuery.graphql';
import { UserList_fragment$key } from '@generated/UserList_fragment.graphql';
import { userServiceCreateMutation } from '@generated/userServiceCreateMutation.graphql';
import { userServiceEditMutation } from '@generated/userServiceEditMutation.graphql';
import { userServices_fragment$data } from '@generated/userServices_fragment.graphql';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { readInlineData, useMutation } from 'react-relay';
import { useDebounceCallback } from 'usehooks-ts';
import { z } from 'zod';

interface UserServiceFormProps {
  connectionId: string;
  userService?: userServices_fragment$data;
  subscription: subscriptionByIdQuery$data;
}

export const UserServiceForm = ({
  connectionId,
  userService,
  subscription,
}: UserServiceFormProps) => {
  const { handleCloseSheet, setIsDirty, setOpenSheet } = useDialogContext();
  const { me } = useContext(PortalContext);

  const [commitUserServiceEditMutation] = useMutation<userServiceEditMutation>(
    UserServiceEditMutation
  );
  const [commitUserServiceMutation] = useMutation<userServiceCreateMutation>(
    UserServiceCreateMutation
  );
  const { toast } = useToast();
  const t = useTranslate();
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
    commitUserServiceEditMutation({
      variables: {
        input: {
          userServiceId: userService.id,
          ...editCapaValues,
        },
        service_instance_id:
          subscription.subscriptionById!.service_instance!.id,
      },
      onCompleted() {
        toast({
          title: t('Utils.Success'),
          description: t('ServiceActions.UserCapabilitiesModified', {
            email: userService!.user!.email,
          }),
        });
        setOpenSheet(false);
      },
      onError(error) {
        toast({
          variant: 'destructive',
          title: t('Utils.Error'),
          description: t(`Error.Server.${error.message}`),
        });
      },
    });
  };

  const onSubmitExtendSchema = (values: z.infer<typeof extendedSchema>) => {
    if (
      !subscription.subscriptionById ||
      !subscription.subscriptionById.service_instance
    ) {
      return;
    }
    commitUserServiceMutation({
      variables: {
        connections: [connectionId ?? ''],
        input: {
          email: values.email,
          capabilities: values.capabilities,
          subscription_id: subscription.subscriptionById.id,
        },
        service_instance_id: subscription.subscriptionById.service_instance.id,
      },
      onCompleted() {
        toast({
          title: t('Utils.Success'),
          description: t('ServiceActions.UserServiceAdded', {
            email: values.email.join(', '),
            serviceName: subscription.subscriptionById!.service_instance!.name,
          }),
        });
        setOpenSheet(false);
      },

      onError(error) {
        toast({
          variant: 'destructive',
          title: t('Utils.Error'),
          description: <>{t(`Error.Server.${error.message}`)}</>,
        });
      },
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

  const { data, refetch } = useUsersList({
    pageSize,
    orderMode,
    orderBy,
    filter: { organization: organizationId },
  });
  const handleUsersInputChange = useDebounceCallback((search: string) => {
    refetch({
      count: pageSize,
      orderMode,
      orderBy,
      searchTerm: search,
      filters: organizationId
        ? [{ key: 'organization_id', value: [organizationId] }]
        : undefined,
    });
  }, DEBOUNCE_TIME);

  const usersOptions = useMemo(() => {
    return (
      data?.users?.edges
        ?.filter((edge) => {
          const user = readInlineData<UserList_fragment$key>(
            UserFragment,
            edge.node
          );
          return user.id !== me?.id;
        })
        ?.map((edge) => {
          const user = readInlineData<UserList_fragment$key>(
            UserFragment,
            edge.node
          );
          return {
            label: user.email,
            value: user.email,
          };
        }) ?? []
    );
  }, [data?.users?.edges, me?.id]);

  return (
    <Form {...(form as typeof extendedForm)}>
      <form
        className="space-y-xl"
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('InviteUserServiceForm.Email')}</FormLabel>
                  <FormControl>
                    <MultiSelectFormField
                      popoverContentClassName="bg-elevation-background-layer-3"
                      shouldFilter={false}
                      options={usersOptions}
                      defaultValue={field.value}
                      value={field.value}
                      onValueChange={field.onChange}
                      onInputChange={handleUsersInputChange}
                      noResultString={t('Utils.NotFound')}
                      placeholder={t('Service.Management.Email')}
                      variant="inverted"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <div className="border border-primary rounded-lg p-l">
          <FormLabel>{t('OrganizationInServiceAction.SelectCapa')}</FormLabel>
          <p className="txt-sub-content italic">
            {t('InviteUserServiceForm.Description')}
          </p>
          {capabilitiesData.map((capability) => (
            <FormField
              key={capability!.id}
              control={(form as typeof capabilitiesForm).control}
              name="capabilities"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center">
                  <FormControl>
                    <Checkbox
                      {...field}
                      disabled={isCapabilityDisabled(capability!.id)}
                      className="mt-xs"
                      checked={(field.value as string[]).includes(
                        capability!.id
                      )}
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
                      id={capability!.id}
                    />
                  </FormControl>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <label
                          htmlFor={capability!.id}
                          aria-disabled={isCapabilityDisabled(capability!.id)}
                          className="txt-sub-content cursor-pointer aria-disabled:cursor-not-allowed">
                          {capability!.name === ServiceRestriction.ManageAccess
                            ? t('Service.Form.ManageAccessCapabilityLabel')
                            : t('Service.Form.CapabilityAccessLabel', {
                                name: capability!.name ?? '',
                                description: capability!.description ?? '',
                              })}
                          {isCapabilityDisabled(capability!.id)}
                        </label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {isCapabilityDisabled(capability!.id)
                            ? t('InviteUserServiceForm.DisabledCapability')
                            : t('InviteUserServiceForm.GrantCapability')}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FormItem>
              )}
            />
          ))}
        </div>

        <SheetFooter className="pt-2">
          <Button
            variant="secondary"
            type="button"
            onClick={(e) => handleCloseSheet(e)}>
            {t('Utils.Cancel')}
          </Button>
          <Button type="submit">{t('Utils.Validate')}</Button>
        </SheetFooter>
      </form>
    </Form>
  );
};
