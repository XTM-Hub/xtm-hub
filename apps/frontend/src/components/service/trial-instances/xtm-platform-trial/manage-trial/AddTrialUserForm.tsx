'use client';

import { PortalContext } from '@/components/me/AppPortalContext';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { toast } from '@filigran/ui';
import {
  FilterKey,
  OrderingMode,
  PlatformIdentifier,
  ServiceGroupName,
  useAddUsersToBundleGroupsMutation,
  useBundleUserServiceGroupsQuery,
  UserOrdering,
  useUsersQuery,
} from '@graphql/generated';
import { bundleUserServiceGroupsKeys } from '@graphql/service-group/service-group.keys';
import { usersKeys } from '@graphql/user/users.keys';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useContext, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  getBundleRolePanels,
  RoleFormField,
  trialUserRolesFormSchema,
  TrialUserRolesFormValues,
} from './manage-trial.const';
import { TrialUserFormSkeleton } from './TrialUserFormSkeleton';

interface AddTrialUserFormProps {
  serviceInstanceId: string;
  products: PlatformIdentifier[];
  onCompleted: () => void;
  onCancel: () => void;
}

const USERS_PAGE_SIZE = 50;

export const AddTrialUserForm = ({
  serviceInstanceId,
  products,
  onCompleted,
  onCancel,
}: AddTrialUserFormProps) => {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const { me } = useContext(PortalContext);

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

  const organizationId = me?.selected_organization_id;

  const usersVariables = {
    first: USERS_PAGE_SIZE,
    orderBy: UserOrdering.Email,
    orderMode: OrderingMode.Asc,
    filters: organizationId
      ? [{ key: FilterKey.OrganizationId, value: [organizationId] }]
      : [],
    searchTerm: null,
  };
  const { data: usersData } = useUsersQuery(
    portalGraphqlClient,
    usersVariables,
    {
      queryKey: usersKeys.list(usersVariables),
      enabled: !!organizationId,
    }
  );

  const existingUserIds = useMemo(
    () =>
      new Set(
        (bundleUserServiceGroupsData?.bundleUserServiceGroups ?? []).map(
          ({ user }) => user.id
        )
      ),
    [bundleUserServiceGroupsData]
  );

  const usersOptions = useMemo(
    () =>
      (usersData?.users.edges ?? [])
        .filter(({ node }) => !existingUserIds.has(node.id))
        .map(({ node }) => ({
          label: node.email,
          value: node.id,
        })),
    [usersData, existingUserIds]
  );

  const form = useForm<TrialUserRolesFormValues>({
    resolver: zodResolver(trialUserRolesFormSchema),
    defaultValues: {
      userIds: [],
      xtmoneRole: ServiceGroupName.User,
    },
  });

  const { mutate: addUsersToBundleGroups, isPending } =
    useAddUsersToBundleGroupsMutation(portalGraphqlClient, {
      onSuccess: (data) => {
        queryClient.setQueryData(
          bundleUserServiceGroupsKeys.list(bundleUserServiceGroupsVariables),
          { bundleUserServiceGroups: data.addUsersToBundleGroups }
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
    const roles = bundleRolePanels.flatMap(({ platform }) => {
      const fieldName: RoleFormField = `${platform}Role`;
      const role = values[fieldName];
      return role ? [{ product: platform, role }] : [];
    });

    addUsersToBundleGroups({
      serviceInstanceId,
      input: { userIds: values.userIds, roles },
    });
  };

  return (
    <TrialUserFormSkeleton
      form={form}
      onSubmit={onSubmit}
      usersOptions={usersOptions}
      pickerPlaceholder={t(
        'Service.Bundle.ManageTrial.AddUserDialog.EmailPlaceholder'
      )}
      products={products}
      bundleRolePanels={bundleRolePanels}
      onCancel={onCancel}
      isPending={isPending}
    />
  );
};
