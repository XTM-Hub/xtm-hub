'use client';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DisabledActionTooltip } from '@/components/ui/DisabledActionTooltip';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { XTM_PLATFORM_TRIAL_PATH } from '@/utils/path/constant';
import {
  Button,
  IconButton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import { ArrowUpwardIcon, DeleteIcon } from '@filigran/icon';
import {
  BundleUserServiceGroupsQuery,
  PlatformIdentifier,
  useRemoveUsersFromBundleGroupsMutation,
} from '@graphql/generated';
import { bundleUserServiceGroupsKeys } from '@graphql/service-group/service-group.keys';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { TrialUserDialog } from './TrialUserDialog';
import {
  formatEmailList,
  removeUsersFromBundleCache,
} from './manage-trial.utils';

interface ManageTrialHeaderUser {
  id: string;
  email: string;
}

interface ManageTrialHeaderProps {
  serviceInstanceId: string;
  products: PlatformIdentifier[];
  selectedUsers: ManageTrialHeaderUser[];
  onUsersRemoved: () => void;
  backHref?: string;
  backLabelKey?: string;
}

export const ManageTrialHeader = ({
  serviceInstanceId,
  products,
  selectedUsers,
  onUsersRemoved,
  backHref = XTM_PLATFORM_TRIAL_PATH,
  backLabelKey = 'Service.Bundle.ManageTrial.BackButton',
}: ManageTrialHeaderProps) => {
  const t = useTranslate();
  const queryClient = useQueryClient();
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUsersDialogOpen, setIsEditUsersDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const { mutate: removeUsersFromBundleGroups } =
    useRemoveUsersFromBundleGroupsMutation(portalGraphqlClient, {
      onSuccess: (_data, mutationVariables) => {
        const variables = { serviceInstanceId };
        queryClient.setQueryData<BundleUserServiceGroupsQuery>(
          bundleUserServiceGroupsKeys.list(variables),
          (previous) =>
            removeUsersFromBundleCache(previous, mutationVariables.userIds)
        );
        showSnackbar({ severity: 'success', title: t('Utils.Success') });
        setIsBulkDeleting(false);
        onUsersRemoved();
      },
      onError: (error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : 'UnknownError';
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: <>{t(`Error.Server.${errorMessage}`)}</>,
        });
        setIsBulkDeleting(false);
      },
    });

  const { visible, hiddenCount } = formatEmailList(
    selectedUsers.map((user) => user.email)
  );

  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="title-sm w-fit text-gradient-focus">
          {t('Service.Bundle.ManageTrial.Eyebrow')}
        </p>
        <h1 className="title-2xl">{t('Service.Bundle.ManageTrial.Title')}</h1>
        <p className="text-content-base max-w-3xl">
          {t('Service.Bundle.ManageTrial.Description')}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          priority="secondary"
          className="gap-2 border-elevation-default"
          asChild>
          <Link href={backHref}>
            <ArrowUpwardIcon className="h-3 w-3 -rotate-90" />
            {t(backLabelKey)}
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {selectedUsers.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <ConfirmDialog
                  title={t('Service.Bundle.ManageTrial.BulkDeleteDialog.Title')}
                  confirmLabel={t('Utils.Delete')}
                  destructive
                  confirmDisabled={isBulkDeleting}
                  trigger={
                    <TooltipTrigger asChild>
                      <IconButton
                        type="button"
                        priority="tertiary"
                        aria-label={t('Utils.Delete')}
                        disabled={isBulkDeleting}
                        icon={<DeleteIcon className="h-4 w-4" />}
                      />
                    </TooltipTrigger>
                  }
                  onConfirm={() => {
                    setIsBulkDeleting(true);
                    removeUsersFromBundleGroups({
                      serviceInstanceId,
                      userIds: selectedUsers.map((user) => user.id),
                    });
                  }}>
                  {t('Service.Bundle.ManageTrial.BulkDeleteDialog.Text', {
                    emails:
                      hiddenCount > 0
                        ? `${visible} ${t('Service.Bundle.ManageTrial.BulkDeleteDialog.MoreEmails', { count: hiddenCount })}`
                        : visible,
                  })}
                </ConfirmDialog>
                <TooltipContent>
                  {t('Service.Bundle.ManageTrial.BulkDeleteTooltip')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {selectedUsers.length === 0 ? (
            <DisabledActionTooltip
              reason={t(
                'Service.Bundle.ManageTrial.GroupActionDisabledTooltip'
              )}>
              <Button
                priority="secondary"
                disabled
                className="border-elevation-default">
                {t('Service.Bundle.ManageTrial.GroupAction')}
              </Button>
            </DisabledActionTooltip>
          ) : (
            <Button
              priority="secondary"
              className="border-elevation-default"
              onClick={() => setIsEditUsersDialogOpen(true)}>
              {t('Service.Bundle.ManageTrial.GroupAction')}
            </Button>
          )}
          <Button onClick={() => setIsAddUserDialogOpen(true)}>
            {t('Service.Bundle.ManageTrial.AddTrialUser')}
          </Button>
        </div>
      </div>
      <TrialUserDialog
        mode="add"
        serviceInstanceId={serviceInstanceId}
        products={products}
        open={isAddUserDialogOpen}
        setOpen={setIsAddUserDialogOpen}
      />
      <TrialUserDialog
        mode="edit"
        serviceInstanceId={serviceInstanceId}
        products={products}
        initialUserIds={selectedUsers.map((user) => user.id)}
        open={isEditUsersDialogOpen}
        setOpen={setIsEditUsersDialogOpen}
      />
    </header>
  );
};
