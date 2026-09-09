'use client';

import { AlertDialogComponent } from '@/components/ui/AlertDialog';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { XTM_PLATFORM_TRIAL_PATH } from '@/utils/path/constant';
import { ArrowUpwardIcon, DeleteIcon } from '@filigran/icon';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  toast,
} from '@filigran/ui';
import {
  BundleUserServiceGroupsQuery,
  PlatformIdentifier,
  useRemoveUsersFromBundleGroupsMutation,
} from '@graphql/generated';
import { bundleUserServiceGroupsKeys } from '@graphql/service-group/service-group.keys';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { TrialUserDialog } from './TrialUserDialog';
import { formatEmailList } from './manage-trial.utils';

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
  const t = useTranslations();
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
            previous && {
              bundleUserServiceGroups: previous.bundleUserServiceGroups.filter(
                (row) => !mutationVariables.userIds.includes(row.user.id)
              ),
            }
        );
        toast({ title: t('Utils.Success') });
        setIsBulkDeleting(false);
        onUsersRemoved();
      },
      onError: (error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : 'UnknownError';
        toast({
          variant: 'destructive',
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
    <header className="flex flex-col gap-l">
      <div className="flex flex-col gap-xs">
        <p className="heading-sm w-fit bg-clip-text text-transparent bg-gradient-focus">
          {t('Service.Bundle.ManageTrial.Eyebrow')}
        </p>
        <h1 className="heading-2xl">{t('Service.Bundle.ManageTrial.Title')}</h1>
        <p className="text-content-body-base max-w-3xl">
          {t('Service.Bundle.ManageTrial.Description')}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-m">
        <Button
          variant="outline"
          className="gap-s border-elevation-border-default-layer-0"
          asChild>
          <Link href={backHref}>
            <ArrowUpwardIcon className="h-3 w-3 -rotate-90" />
            {t(backLabelKey)}
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-s">
          {selectedUsers.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <AlertDialogComponent
                  AlertTitle={t(
                    'Service.Bundle.ManageTrial.BulkDeleteDialog.Title'
                  )}
                  actionButtonText={t('Utils.Delete')}
                  variantName="destructive"
                  continueButtonDisabled={isBulkDeleting}
                  triggerElement={
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="tertiary"
                        size="icon"
                        aria-label={t('Utils.Delete')}
                        disabled={isBulkDeleting}>
                        <DeleteIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                  }
                  onClickContinue={() => {
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
                </AlertDialogComponent>
                <TooltipContent className="bg-elevation-border-subtle-layer-0 dark:bg-elevation-border-subtle-layer-0 text-text-default-primary">
                  {t('Service.Bundle.ManageTrial.BulkDeleteTooltip')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {selectedUsers.length === 0 ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  asChild
                  className="w-fit"
                  style={{ cursor: 'unset' }}>
                  <div>
                    <Button
                      variant="outline"
                      disabled
                      className="border-elevation-border-default-layer-0">
                      {t('Service.Bundle.ManageTrial.GroupAction')}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-elevation-border-subtle-layer-0 dark:bg-elevation-border-subtle-layer-0 text-text-default-primary">
                  {t('Service.Bundle.ManageTrial.GroupActionDisabledTooltip')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              variant="outline"
              className="border-elevation-border-default-layer-0"
              onClick={() => setIsEditUsersDialogOpen(true)}>
              {t('Service.Bundle.ManageTrial.GroupAction')}
            </Button>
          )}
          <Button
            variant="default"
            onClick={() => setIsAddUserDialogOpen(true)}>
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
