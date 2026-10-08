import { useUserListLocalstorage } from '@/components/admin/user/user-list-localstorage';
import { UserFragment } from '@/components/admin/user/UserList';
import { serviceGroupFragment } from '@/components/service/service-group.graphql';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { useUsersList } from '@/hooks/use-users-list';
import { toComboboxOptionIds } from '@/utils/combobox-option-ids';
import {
  Button,
  Combobox,
  ComboboxChips,
  ComboboxClear,
  ComboboxContent,
  ComboboxControls,
  ComboboxField,
  ComboboxInput,
  ComboboxLabel,
  ComboboxTrigger,
} from '@filigran/design-system';
import { Form, FormField, FormItem, SheetFooter } from '@filigran/ui';
import { serviceGroup_fragment$key } from '@generated/serviceGroup_fragment.graphql';
import ServiceGroupsByServiceInstanceIdQueryGraphql, {
  serviceGroupsByServiceInstanceIdQuery,
} from '@generated/serviceGroupsByServiceInstanceIdQuery.graphql';
import ServiceGroupsUpdateMutationGraphql from '@generated/serviceGroupsUpdateMutation.graphql';
import { UserList_fragment$key } from '@generated/UserList_fragment.graphql';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { readInlineData, useLazyLoadQuery, useMutation } from 'react-relay';
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

export const TrialsManageUsersForm = ({
  onCancel,
  organizationId,
  serviceInstanceId,
  onCompleted,
}: TrialsManageUsersFormProps) => {
  const t = useTranslate();
  const { orderMode, orderBy, pageSize } = useUserListLocalstorage();
  const { data: availableUsers } = useUsersList({
    orderMode,
    orderBy,
    pageSize,
    filter: { organization: organizationId },
  });

  const data = useLazyLoadQuery<serviceGroupsByServiceInstanceIdQuery>(
    ServiceGroupsByServiceInstanceIdQueryGraphql,
    { serviceInstanceId: serviceInstanceId }
  );

  const [commitUpdateServiceGroups] = useMutation(
    ServiceGroupsUpdateMutationGraphql
  );

  const onSubmit = (input: z.infer<typeof formSchema>) => {
    commitUpdateServiceGroups({
      variables: {
        input: {
          groups: input.groups.map(({ id, userIds }) => ({ id, userIds })),
        },
      },
      onError(error) {
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: t(`Error.Server.${error.message}`),
        });
      },
      onCompleted() {
        onCompleted();
        showSnackbar({
          severity: 'success',
          title: t('Utils.Success'),
        });
      },
    });
  };

  const options = useMemo(() => {
    return availableUsers.users.edges.map(({ node }) => {
      const { email, id } = readInlineData<UserList_fragment$key>(
        UserFragment,
        node
      );
      return {
        label: email,
        value: id,
      };
    });
  }, [availableUsers.users.edges]);
  const optionIds = useMemo(
    () =>
      toComboboxOptionIds(
        options,
        (option) => option.value,
        (option) => option.label
      ),
    [options]
  );

  const groups = useMemo(() => {
    return data.serviceGroups.map((group) => {
      const { id, name, users } = readInlineData<serviceGroup_fragment$key>(
        serviceGroupFragment,
        group
      );

      const userIds = (users ?? []).map(
        ({ email }) => options.find(({ label }) => label === email)?.value
      );

      return {
        id,
        name,
        userIds,
      };
    });
  }, [data.serviceGroups, options]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      groups,
    },
  });
  const groupFields = useMemo(() => {
    return groups.map((group, index) => (
      <FormField
        key={group.name}
        control={form.control}
        render={({ field: { value, onChange } }) => {
          return (
            <FormItem>
              <Combobox<string>
                multiple
                options={optionIds.ids}
                value={value ?? []}
                onValueChange={(next) => onChange(next as string[])}
                getOptionLabel={optionIds.getOptionLabel}>
                <ComboboxLabel>{group.name}</ComboboxLabel>
                <ComboboxField>
                  <ComboboxChips />
                  <ComboboxInput
                    placeholder={t('Service.Trials.ManageUsers.Email')}
                  />
                  <ComboboxControls>
                    <ComboboxClear />
                    <ComboboxTrigger />
                  </ComboboxControls>
                </ComboboxField>
                <ComboboxContent
                  emptyMessage={t('Utils.NotFound')}
                  listAriaLabel={group.name}
                />
              </Combobox>
            </FormItem>
          );
        }}
        name={`groups.${index}.userIds`}
      />
    ));
  }, [groups, form.control, t, optionIds]);

  return (
    <Form {...form}>
      <form
        className="w-full space-y-xl"
        onSubmit={form.handleSubmit(onSubmit)}>
        {groupFields}
        <SheetFooter>
          <div className="flex gap-s">
            <Button
              priority="secondary"
              type="button"
              onClick={onCancel}>
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
