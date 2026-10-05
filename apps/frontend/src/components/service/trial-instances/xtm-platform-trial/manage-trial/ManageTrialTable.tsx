'use client';

import { AlertDialogComponent } from '@/components/ui/AlertDialog';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { i18nKey } from '@/utils/datatable';
import { DeleteIcon } from '@filigran/icon';
import { Button, DataTable, SelectionState, toast } from '@filigran/ui';
import {
  BundleUserServiceGroupsQuery,
  PlatformIdentifier,
  useBundleUserServiceGroupsQuery,
  useRemoveUsersFromBundleGroupsMutation,
  useUpdateBundleUserGroupsMutation,
} from '@graphql/generated';
import { bundleUserServiceGroupsKeys } from '@graphql/service-group/service-group.keys';
import { useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import {
  getBundleRolePanels,
  NO_ROLE_VALUE,
  RoleFormField,
} from './manage-trial.const';
import { isServiceGroupName } from './manage-trial.utils';
import { RoleSelect } from './RoleSelect';

interface ManageTrialTableProps {
  serviceInstanceId: string;
  products: PlatformIdentifier[];
  selection: SelectionState;
  onSelectionChange: Dispatch<SetStateAction<SelectionState>>;
}

interface ManageTrialTableRow {
  id: string;
  email: string;
  openctiRole: string;
  openaevRole: string;
  xtmoneRole: string;
}

interface PendingRoleUpdate {
  userId: string;
  platform: PlatformIdentifier;
}

const findRoleValue = (
  groups: BundleUserServiceGroupsQuery['bundleUserServiceGroups'][number]['groups'],
  platform: PlatformIdentifier
): string => {
  const role = groups.find(
    (group) => group.platformIdentifier === platform
  )?.name;
  if (role) {
    return role;
  }
  return platform === PlatformIdentifier.Xtmone ? '' : NO_ROLE_VALUE;
};

export const ManageTrialTable = ({
  serviceInstanceId,
  products,
  selection,
  onSelectionChange,
}: ManageTrialTableProps) => {
  const t = useTranslate();
  const queryClient = useQueryClient();
  const [deletingUserId, setDeletingUserId] = useState<string | undefined>(
    undefined
  );
  const [pendingRoleUpdate, setPendingRoleUpdate] = useState<
    PendingRoleUpdate | undefined
  >(undefined);

  const variables = { serviceInstanceId };
  const {
    data: queryData,
    isLoading,
    isError,
  } = useBundleUserServiceGroupsQuery(portalGraphqlClient, variables, {
    queryKey: bundleUserServiceGroupsKeys.list(variables),
  });

  const { mutate: removeUsersFromBundleGroups } =
    useRemoveUsersFromBundleGroupsMutation(portalGraphqlClient, {
      onSuccess: (_data, mutationVariables) => {
        queryClient.setQueryData<BundleUserServiceGroupsQuery>(
          bundleUserServiceGroupsKeys.list(variables),
          (previous) =>
            previous && {
              bundleUserServiceGroups: previous.bundleUserServiceGroups.filter(
                (row) => !mutationVariables.userIds.includes(row.user.id)
              ),
            }
        );
        toast({ title: t('Utils.Success') });
        setDeletingUserId(undefined);
      },
      onError: (error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : 'UnknownError';
        toast({
          variant: 'destructive',
          title: t('Utils.Error'),
          description: <>{t(`Error.Server.${errorMessage}`)}</>,
        });
        setDeletingUserId(undefined);
      },
    });

  const { mutate: updateBundleUserGroups } = useUpdateBundleUserGroupsMutation(
    portalGraphqlClient,
    {
      onSuccess: (data, mutationVariables) => {
        queryClient.setQueryData<BundleUserServiceGroupsQuery>(
          bundleUserServiceGroupsKeys.list(variables),
          { bundleUserServiceGroups: data.updateBundleUserGroups }
        );
        const userId = mutationVariables.input.userIds[0];
        const platform = mutationVariables.input.roles[0]?.product;
        const email = data.updateBundleUserGroups.find(
          (entry) => entry.user.id === userId
        )?.user.email;
        if (email && platform) {
          toast({
            title: t('Service.Bundle.ManageTrial.Table.RoleUpdated', {
              email,
              role: t(`Service.Bundle.ManageTrial.Roles.${platform}.Title`, {
                count: 1,
              }),
            }),
          });
        }
        setPendingRoleUpdate(undefined);
      },
      onError: (error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : 'UnknownError';
        toast({
          variant: 'destructive',
          title: t('Utils.Error'),
          description: <>{t(`Error.Server.${errorMessage}`)}</>,
        });
        setPendingRoleUpdate(undefined);
      },
    }
  );

  const handleRoleChange = (
    userId: string,
    platform: PlatformIdentifier,
    value: string
  ) => {
    setPendingRoleUpdate({ userId, platform });
    updateBundleUserGroups({
      serviceInstanceId,
      input: {
        userIds: [userId],
        roles: [
          {
            product: platform,
            role:
              value !== NO_ROLE_VALUE && isServiceGroupName(value)
                ? value
                : null,
          },
        ],
      },
    });
  };

  const rows = useMemo<ManageTrialTableRow[]>(
    () =>
      (queryData?.bundleUserServiceGroups ?? [])
        .map((row) => ({
          id: row.user.id,
          email: row.user.email,
          openctiRole: findRoleValue(row.groups, PlatformIdentifier.Opencti),
          openaevRole: findRoleValue(row.groups, PlatformIdentifier.Openaev),
          xtmoneRole: findRoleValue(row.groups, PlatformIdentifier.Xtmone),
        }))
        .sort((a, b) => a.email.localeCompare(b.email)),
    [queryData]
  );

  const columns = useMemo<ColumnDef<ManageTrialTableRow>[]>(
    () => [
      {
        accessorKey: 'email',
        id: 'email',
        header: t('Service.Bundle.ManageTrial.Table.Email'),
      },
      ...getBundleRolePanels(products).map(
        ({ platform, roles }): ColumnDef<ManageTrialTableRow> => {
          const accessorKey: RoleFormField = `${platform}Role`;
          const isOptional = platform !== PlatformIdentifier.Xtmone;
          const namespace = `Service.Bundle.ManageTrial.Roles.${platform}`;
          return {
            accessorKey,
            id: `${platform}_role`,
            header: t(`${namespace}.Title`, { count: 1 }),
            cell: ({ row }) => (
              <RoleSelect
                value={row.original[accessorKey]}
                onValueChange={(value) => {
                  if (value === row.original[accessorKey]) {
                    return;
                  }
                  handleRoleChange(row.original.id, platform, value);
                }}
                roles={roles}
                namespace={namespace}
                isOptional={isOptional}
                disabled={
                  pendingRoleUpdate?.userId === row.original.id &&
                  pendingRoleUpdate?.platform === platform
                }
                triggerClassName="h-auto w-[200px] gap-xs border-0 shadow-none focus:ring-0 focus:ring-offset-0 layer-0 bg-input-default hover:bg-input-hover"
              />
            ),
          };
        }
      ),
      {
        id: 'actions',
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        size: 48,
        cell: ({ row }) => (
          <div className="flex items-center justify-end">
            <AlertDialogComponent
              AlertTitle={t(
                'Service.Bundle.ManageTrial.Table.DeleteDialog.Title'
              )}
              actionButtonText={t('Utils.Delete')}
              variantName="destructive"
              continueButtonDisabled={deletingUserId === row.original.id}
              triggerElement={
                <Button
                  type="button"
                  variant="tertiary"
                  size="icon"
                  aria-label={t('Utils.Delete')}
                  disabled={deletingUserId === row.original.id}>
                  <DeleteIcon className="h-4 w-4" />
                </Button>
              }
              onClickContinue={() => {
                setDeletingUserId(row.original.id);
                removeUsersFromBundleGroups({
                  serviceInstanceId,
                  userIds: [row.original.id],
                });
              }}>
              {t('Service.Bundle.ManageTrial.Table.DeleteDialog.Text', {
                email: row.original.email,
              })}
            </AlertDialogComponent>
          </div>
        ),
      },
    ],
    [
      t,
      deletingUserId,
      removeUsersFromBundleGroups,
      serviceInstanceId,
      products,
      pendingRoleUpdate,
    ]
  );

  return (
    <>
      {isError && (
        <div className="text-sm text-destructive">{t('Utils.Error')}</div>
      )}
      {!isError && !isLoading && rows.length === 0 && (
        <div className="text-sm text-content-body-secondary">
          {t('Service.Bundle.ManageTrial.Table.NoUsers')}
        </div>
      )}
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        i18nKey={i18nKey(t)}
        toolbar={<></>}
        tableState={{ columnPinning: { right: ['actions'] } }}
        selectionOptions={{
          selectionState: {
            state: selection,
            onSelectionChange: onSelectionChange,
          },
        }}
      />
    </>
  );
};
