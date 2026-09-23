'use client';

import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { toast } from '@filigran/ui';
import {
  PlatformIdentifier,
  ServiceGroupName,
  useBundleUserServiceGroupsQuery,
  useUpdateBundleUserGroupsMutation,
} from '@graphql/generated';
import { bundleUserServiceGroupsKeys } from '@graphql/service-group/service-group.keys';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import {
  getBundleRolePanels,
  RoleFormField,
  trialUserRolesFormSchema,
  TrialUserRolesFormValues,
} from './manage-trial.const';
import { computeMixedRoleDefaults } from './manage-trial.utils';
import { TrialUserFormSkeleton } from './TrialUserFormSkeleton';

interface EditTrialUsersFormProps {
  serviceInstanceId: string;
  products: PlatformIdentifier[];
  initialUserIds: string[];
  onCompleted: () => void;
  onCancel: () => void;
}

export const EditTrialUsersForm = ({
  serviceInstanceId,
  products,
  initialUserIds,
  onCompleted,
  onCancel,
}: EditTrialUsersFormProps) => {
  const t = useTranslate();
  const queryClient = useQueryClient();

  const bundleRolePanels = useMemo(
    () => getBundleRolePanels(products),
    [products]
  );

  const bundleUserServiceGroupsVariables = { serviceInstanceId };
  const { data: bundleUserServiceGroupsData } = useBundleUserServiceGroupsQuery(
    portalGraphqlClient,
    bundleUserServiceGroupsVariables,
    {
      queryKey: bundleUserServiceGroupsKeys.list(
        bundleUserServiceGroupsVariables
      ),
    }
  );

  const bundleUsers = useMemo(
    () => bundleUserServiceGroupsData?.bundleUserServiceGroups ?? [],
    [bundleUserServiceGroupsData]
  );

  const usersOptions = useMemo(
    () =>
      bundleUsers.map(({ user }) => ({
        label: user.email,
        value: user.id,
      })),
    [bundleUsers]
  );

  const form = useForm<TrialUserRolesFormValues>({
    resolver: zodResolver(trialUserRolesFormSchema),
    defaultValues: {
      userIds: initialUserIds,
      xtmoneRole: ServiceGroupName.User,
    },
  });

  const userIds = useWatch({ control: form.control, name: 'userIds' });

  const mixedRoleDefaults = useMemo(
    () =>
      computeMixedRoleDefaults(
        userIds,
        bundleUsers.map(({ user, groups }) => ({ id: user.id, groups })),
        bundleRolePanels
      ),
    [userIds, bundleUsers, bundleRolePanels]
  );

  const { mutate: updateBundleUserGroups, isPending } =
    useUpdateBundleUserGroupsMutation(portalGraphqlClient, {
      onSuccess: (data) => {
        queryClient.setQueryData(
          bundleUserServiceGroupsKeys.list(bundleUserServiceGroupsVariables),
          { bundleUserServiceGroups: data.updateBundleUserGroups }
        );
        toast({ title: t('Utils.Success') });
        onCompleted();
      },
      onError: (error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : 'UnknownError';
        toast({
          variant: 'destructive',
          title: t('Utils.Error'),
          description: <>{t(`Error.Server.${errorMessage}`)}</>,
        });
      },
    });

  const onSubmit = (values: TrialUserRolesFormValues) => {
    const roles = bundleRolePanels.map(({ platform, defaultRole }) => {
      const fieldName: RoleFormField = `${platform}Role`;
      const role = form.getFieldState(fieldName).isTouched
        ? values[fieldName]
        : (mixedRoleDefaults[platform]?.role ?? defaultRole);
      return { product: platform, role: role ?? null };
    });

    updateBundleUserGroups({
      serviceInstanceId,
      input: { userIds: values.userIds, roles },
    });
  };

  return (
    <TrialUserFormSkeleton
      form={form}
      onSubmit={onSubmit}
      usersOptions={usersOptions}
      pickerLabel={t('Service.Bundle.ManageTrial.EditUsersDialog.Users')}
      pickerPlaceholder={t(
        'Service.Bundle.ManageTrial.EditUsersDialog.UsersPlaceholder'
      )}
      products={products}
      bundleRolePanels={bundleRolePanels}
      mixedRoleDefaults={mixedRoleDefaults}
      onCancel={onCancel}
      isPending={isPending}
    />
  );
};
