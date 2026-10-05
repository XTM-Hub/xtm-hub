import { SubscriptionDeleteMutation } from '@/components/subcription/subscription.graphql';
import { AlertDialogComponent } from '@/components/ui/AlertDialog';
import { useTranslate } from '@/hooks/use-translate';
import { useToast } from '@filigran/ui';
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

  const { toast } = useToast();
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

        toast({
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
        toast({
          variant: 'destructive',
          title: t('Utils.Error'),
          description: <>{t(`Error.Server.${error.message}`)}</>,
        });
      },
    });
  };

  return (
    <AlertDialogComponent
      key={`remove-${subscriptions.map((subscription) => subscription.id).join('-')}`}
      AlertTitle={t('Service.Management.RemoveAccess')}
      actionButtonText={t('Service.Management.RemoveAccess')}
      variantName={'destructive'}
      isOpen={open}
      onOpenChange={setOpen}
      onClickContinue={onDeleteSubscription}>
      {subscriptions && subscriptions.length > 1
        ? t('Service.Management.AreYouSureRemoveOrganizationsAccess', {
            count: subscriptions.length,
          })
        : t('Service.Management.AreYouSureRemoveOrganizationAccess', {
            organizationName: subscriptions[0]!.organization.name,
          })}
    </AlertDialogComponent>
  );
};
