import { invalidateSubscriptionQueries } from '@/components/subcription/subscription.invalidation';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  SubscriptionItemFragment,
  useDeleteSubscriptionsMutation,
} from '@graphql/generated';
import { subscriptionKeys } from '@graphql/subscription/subscription.keys';
import { useQueryClient } from '@tanstack/react-query';
import { FunctionComponent } from 'react';

interface ServiceSlugDeleteSubscriptionProps {
  subscriptions: SubscriptionItemFragment[];
  open: boolean;
  setOpen: (open: boolean) => void;
  onDeleted: () => void;
}

export const ServiceSlugDeleteSubscription: FunctionComponent<
  ServiceSlugDeleteSubscriptionProps
> = ({ subscriptions, open, setOpen, onDeleted }) => {
  const queryClient = useQueryClient();
  const t = useTranslate();

  const { mutate: deleteSubscriptions, isPending } =
    useDeleteSubscriptionsMutation(portalGraphqlClient, {
      onSuccess: async (_data, { subscription_ids }) => {
        subscription_ids.forEach((subscriptionId: string) =>
          queryClient.removeQueries({
            queryKey: subscriptionKeys.byId({ subscriptionId }),
          })
        );
        await invalidateSubscriptionQueries(queryClient);
        setOpen(false);
        onDeleted();
        const organizations = subscriptions
          .map((sub) => sub.organization.name)
          .join(', ');

        showSnackbar({
          severity: 'success',
          title: t('Utils.Success'),
          description: t('ServiceActions.OrganizationDeleted', {
            name:
              organizations.length > 50
                ? `${organizations.slice(0, 50)}...`
                : organizations,
          }),
        });
      },
      onError: (error: unknown) => {
        setOpen(false);
        const errorMessage =
          error instanceof Error ? error.message : 'UNKNOWN_ERROR';
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: <>{t(`Error.Server.${errorMessage}`)}</>,
        });
      },
    });

  const onDeleteSubscription = () => {
    deleteSubscriptions({
      subscription_ids: subscriptions.map((subscription) => subscription.id),
    });
  };

  return (
    <ConfirmDialog
      confirmAnalyticsId="admin_subscription_removal_confirm"
      key={`remove-${subscriptions.map((subscription) => subscription.id).join('-')}`}
      title={t('Service.Management.RemoveAccess')}
      confirmLabel={t('Service.Management.RemoveAccess')}
      destructive
      open={open}
      onOpenChange={setOpen}
      confirmDisabled={isPending}
      onConfirm={(event) => {
        // Closing unmounts the dialog: the callbacks close it once the deletion settles.
        event.preventDefault();
        onDeleteSubscription();
      }}>
      {subscriptions && subscriptions.length > 1
        ? t('Service.Management.AreYouSureRemoveOrganizationsAccess', {
            count: subscriptions.length,
          })
        : t('Service.Management.AreYouSureRemoveOrganizationAccess', {
            organizationName: subscriptions[0]!.organization.name,
          })}
    </ConfirmDialog>
  );
};
