import { SubscriptionDeleteMutation } from '@/components/subcription/subscription.graphql';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { subscriptionDeleteMutation } from '@generated/subscriptionDeleteMutation.graphql';
import { subscription_fragment$data } from '@generated/subscription_fragment.graphql';
import { FunctionComponent } from 'react';
import { useMutation } from 'react-relay';

interface ServiceSlugDeleteSubscriptionProps {
  subscriptions: subscription_fragment$data[];
  subscriptionConnectionId: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  onDeleted: () => void;
}

export const ServiceSlugDeleteSubscription: FunctionComponent<
  ServiceSlugDeleteSubscriptionProps
> = ({ subscriptions, subscriptionConnectionId, open, setOpen, onDeleted }) => {
  const [commitDeleteSubscription] = useMutation<subscriptionDeleteMutation>(
    SubscriptionDeleteMutation
  );

  const t = useTranslate();

  const onDeleteSubscription = () => {
    commitDeleteSubscription({
      variables: {
        subscription_ids: subscriptions.map((subscription) => subscription.id),
        connections: [subscriptionConnectionId],
      },
      onCompleted: () => {
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
      onError: (error) => {
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: <>{t(`Error.Server.${error.message}`)}</>,
        });
      },
    });
  };

  return (
    <ConfirmDialog
      key={`remove-${subscriptions.map((subscription) => subscription.id).join('-')}`}
      title={t('Service.Management.RemoveAccess')}
      confirmLabel={t('Service.Management.RemoveAccess')}
      destructive
      open={open}
      onOpenChange={setOpen}
      onConfirm={onDeleteSubscription}>
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
