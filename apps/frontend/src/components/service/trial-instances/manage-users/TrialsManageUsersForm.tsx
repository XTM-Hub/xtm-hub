import { useUserListLocalstorage } from '@/components/admin/user/user-list-localstorage';
import Loader from '@/components/Loader';
import { AppCombobox } from '@/components/ui/AppCombobox';
import { Form, FormField } from '@/components/ui/form';
import { SheetFooter } from '@/components/ui/sheet';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useKeepSelectedOptions } from '@/hooks/use-keep-selected-options';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { throwOnFirstLoadError } from '@/lib/query-client';
import { toComboboxOptionIds } from '@/utils/design-system/combobox';
import { Button } from '@filigran/design-system';
import {
  FilterKey,
  type ServiceGroupsQuery,
  type UsersQuery,
  useServiceGroupsQuery,
  useUpdateServiceGroupsMutation,
  useUsersQuery,
} from '@graphql/generated';
import { serviceGroupsKeys } from '@graphql/service-group/service-group.keys';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

const formSchema = z.object({
  groups: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      userIds: z.array(z.string().min(1)),
    })
  ),
});

interface TrialsManageUsersFormProps {
  onCancel: () => void;
  onCompleted: () => void;
  organizationId?: string;
  serviceInstanceId: string;
}

const getUserOptionValue = ({ value }: { value: string }) => value;

export const TrialsManageUsersForm = ({
  onCancel,
  organizationId,
  serviceInstanceId,
  onCompleted,
}: TrialsManageUsersFormProps) => {
  const { orderMode, orderBy, pageSize } = useUserListLocalstorage();
  const { data: availableUsers } = useUsersQuery(
    portalGraphqlClient,
    {
      first: pageSize,
      orderMode,
      orderBy,
      searchTerm: null,
      filters: organizationId
        ? [{ key: FilterKey.OrganizationId, value: [organizationId] }]
        : null,
    },
    {
      // Like Relay, a failed load reaches the error page; a failed background
      // refetch keeps the users shown.
      throwOnError: (_error, query) => query.state.data === undefined,
    }
  );

  const serviceGroupsVariables = useMemo(
    () => ({ serviceInstanceId }),
    [serviceInstanceId]
  );
  const { data: serviceGroups } = useServiceGroupsQuery(
    portalGraphqlClient,
    serviceGroupsVariables,
    {
      queryKey: serviceGroupsKeys.list(serviceGroupsVariables),
      // Each opening reads the current memberships, even when a cached
      // snapshot is still fresh: the update replaces them group by group.
      refetchOnMount: 'always',
      throwOnError: throwOnFirstLoadError,
    }
  );

  // The form waits for the users and the groups, as it did when the Relay
  // query suspended it: its default values are the loaded groups.
  if (!availableUsers || !serviceGroups) {
    return <Loader />;
  }

  return (
    <TrialsManageUsersFormContent
      availableUsers={availableUsers}
      serviceGroups={serviceGroups}
      onCancel={onCancel}
      onCompleted={onCompleted}
    />
  );
};

interface TrialsManageUsersFormContentProps {
  availableUsers: UsersQuery;
  serviceGroups: ServiceGroupsQuery;
  onCancel: () => void;
  onCompleted: () => void;
}

const TrialsManageUsersFormContent = ({
  availableUsers,
  serviceGroups,
  onCancel,
  onCompleted,
}: TrialsManageUsersFormContentProps) => {
  const t = useTranslate();
  const queryClient = useQueryClient();

  const { mutate: updateServiceGroups, isPending: isInFlight } =
    useUpdateServiceGroupsMutation(portalGraphqlClient, {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: serviceGroupsKeys.all(),
        });
        onCompleted();
        showSnackbar({
          severity: 'success',
          title: t('Utils.Success'),
        });
      },
      onError: (error: Error) => {
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: t(`Error.Server.${error.message}`),
        });
      },
    });

  const onSubmit = (input: z.infer<typeof formSchema>) => {
    updateServiceGroups({
      input: {
        groups: input.groups.map(({ id, userIds }) => ({ id, userIds })),
      },
    });
  };

  const options = useMemo(
    () =>
      availableUsers.users.edges.map(({ node }) => ({
        label: node.email,
        value: node.id,
      })),
    [availableUsers]
  );

  const groups = useMemo(
    () =>
      serviceGroups.serviceGroups.map(({ id, name, users }) => ({
        id,
        name,
        users: users ?? [],
      })),
    [serviceGroups]
  );
  const groupUserOptions = useMemo(
    () =>
      groups.flatMap(({ users }) =>
        users.map(({ id, email }) => ({ label: email, value: id }))
      ),
    [groups]
  );

  const formValues = useMemo(
    () => ({
      groups: groups.map(({ id, name, users }) => ({
        id,
        name,
        userIds: users.map((user) => user.id),
      })),
    }),
    [groups]
  );

  // The form shows a cached snapshot until the refetch of the opening lands:
  // the refreshed memberships then replace the groups left untouched, and the
  // groups already edited keep their edits.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: formValues,
    resetOptions: { keepDirtyValues: true },
  });

  const watchedGroups = useWatch({ control: form.control, name: 'groups' });
  const selectedUserIds = useMemo(
    () => watchedGroups.flatMap(({ userIds }) => userIds),
    [watchedGroups]
  );
  const keptOptions = useKeepSelectedOptions({
    options,
    value: selectedUserIds,
    getId: getUserOptionValue,
    initialOptions: groupUserOptions,
  });
  const optionIds = useMemo(
    () =>
      toComboboxOptionIds(
        keptOptions,
        getUserOptionValue,
        (option) => option.label
      ),
    [keptOptions]
  );

  const groupFields = useMemo(() => {
    return groups.map((group, index) => (
      <FormField
        key={group.name}
        control={form.control}
        render={({ field: { value, onChange }, fieldState }) => {
          return (
            <AppCombobox
              formField
              multiple
              label={group.name}
              placeholder={t('Service.Trials.ManageUsers.Email')}
              error={fieldState.error?.message}
              options={optionIds.ids}
              value={value ?? []}
              onValueChange={onChange}
              getOptionLabel={optionIds.getOptionLabel}
            />
          );
        }}
        name={`groups.${index}.userIds`}
      />
    ));
  }, [groups, form.control, t, optionIds]);

  return (
    <Form {...form}>
      <form
        className="w-full space-y-6"
        onSubmit={form.handleSubmit(onSubmit)}>
        {groupFields}
        <SheetFooter>
          <div className="flex gap-2">
            <Button
              {...analyticsId('trial_users_cancel')}
              priority="secondary"
              type="button"
              onClick={onCancel}>
              {t('Utils.Cancel')}
            </Button>
            <Button
              {...analyticsId('trial_users_submit')}
              disabled={!form.formState.isDirty}
              loading={isInFlight}
              type="submit">
              {t('Utils.Validate')}
            </Button>
          </div>
        </SheetFooter>
      </form>
    </Form>
  );
};
