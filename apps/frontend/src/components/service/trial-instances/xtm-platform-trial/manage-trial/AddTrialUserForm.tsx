'use client';

import { PortalContext } from '@/components/me/AppPortalContext';
import useGranted from '@/hooks/use-granted';
import { useIsFeatureEnabled } from '@/hooks/use-is-feature-enabled';
import { useAdminByPass } from '@/hooks/use-portal-capability';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { CheckIndeterminateIcon } from '@filigran/icon';
import { toast } from '@filigran/ui';
import {
  FeatureFlag,
  OrganizationCapability,
  PlatformIdentifier,
  ServiceGroupName,
  useAddUsersToBundleGroupsMutation,
  useBundleUserServiceGroupsQuery,
} from '@graphql/generated';
import { bundleUserServiceGroupsKeys } from '@graphql/service-group/service-group.keys';
import { usersKeys } from '@graphql/user/users.keys';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { ReactNode, useContext, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  getBundleRolePanels,
  RoleFormField,
  splitUserSelection,
  trialUserRolesFormSchema,
  TrialUserRolesFormValues,
} from './manage-trial.const';
import { TrialUserFormSkeleton } from './TrialUserFormSkeleton';
import { useTrialUserOptions } from './use-trial-user-options';

const PickerWarning = ({ children }: { children: ReactNode }) => (
  <div className="border border-solid border-orange rounded text-feedback-warning-primary flex items-center gap-xs p-s text-sm">
    <CheckIndeterminateIcon className="shrink-0 h-4 w-4 mr-xs" />
    {children}
  </div>
);

interface AddTrialUserFormProps {
  serviceInstanceId: string;
  products: PlatformIdentifier[];
  onCompleted: () => void;
  onCancel: () => void;
}

export const AddTrialUserForm = ({
  serviceInstanceId,
  products,
  onCompleted,
  onCancel,
}: AddTrialUserFormProps) => {
  const t = useTranslate();
  const queryClient = useQueryClient();
  const { me } = useContext(PortalContext);
  const isTrialInviteEnabled = useIsFeatureEnabled(FeatureFlag.TrialInvite);
  const isAdminByPass = useAdminByPass();
  const canAdministrateOrganization = useGranted(
    OrganizationCapability.AdministrateOrganization
  );
  const canManageAccess = useGranted(OrganizationCapability.ManageAccess);
  const canManageUsers = !!(
    isAdminByPass ||
    canAdministrateOrganization ||
    canManageAccess
  );

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
    () =>
      (bundleUserServiceGroupsData?.bundleUserServiceGroups ?? []).map(
        ({ user }) => user
      ),
    [bundleUserServiceGroupsData]
  );

  const {
    usersOptions,
    onUsersInputChange,
    onUsersChange,
    hasSelectedExpiredUsers,
  } = useTrialUserOptions({
    organizationId: me?.selected_organization_id,
    bundleUsers,
    isTrialInviteEnabled,
    canInviteUsers: canManageUsers,
    canInviteOutsideOrganizationDomains: !!isAdminByPass,
  });

  const form = useForm<TrialUserRolesFormValues>({
    resolver: zodResolver(trialUserRolesFormSchema),
    defaultValues: {
      userIds: [],
      xtmoneRole: ServiceGroupName.User,
    },
  });

  const { mutate: addUsersToBundleGroups, isPending } =
    useAddUsersToBundleGroupsMutation(portalGraphqlClient, {
      onSuccess: (data, { input }) => {
        queryClient.setQueryData(
          bundleUserServiceGroupsKeys.list(bundleUserServiceGroupsVariables),
          { bundleUserServiceGroups: data.addUsersToBundleGroups }
        );
        if (input.emails?.length) {
          queryClient.invalidateQueries({ queryKey: usersKeys.all() });
        }
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
    const { userIds, emails } = splitUserSelection(values.userIds);

    addUsersToBundleGroups({
      serviceInstanceId,
      input: { userIds, emails: emails.length > 0 ? emails : null, roles },
    });
  };

  return (
    <TrialUserFormSkeleton
      form={form}
      onSubmit={onSubmit}
      usersOptions={usersOptions}
      onUsersInputChange={onUsersInputChange}
      onUsersChange={onUsersChange}
      pickerPlaceholder={t(
        'Service.Bundle.ManageTrial.AddUserDialog.EmailPlaceholder'
      )}
      pickerNotice={
        <>
          {isTrialInviteEnabled && !canManageUsers && (
            <PickerWarning>
              {t(
                'Service.Bundle.ManageTrial.AddUserDialog.NoPermissionToInvite'
              )}
            </PickerWarning>
          )}
          {hasSelectedExpiredUsers && (
            <PickerWarning>
              {t(
                'Service.Bundle.ManageTrial.AddUserDialog.ExpiredUsersReinvited'
              )}
            </PickerWarning>
          )}
        </>
      }
      products={products}
      bundleRolePanels={bundleRolePanels}
      onCancel={onCancel}
      isPending={isPending}
    />
  );
};
