import { BadgeOverflow } from '@/components/ui/BadgeOverflowCounter';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { invalidateUserServiceQueries } from '@/utils/query-invalidation/user-service.invalidation';
import {
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@filigran/design-system';
import {
  type UserServiceItemFragment,
  useAddCapabilitiesToUserServicesMutation,
} from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

interface SubscriptionSlugAddCapabilitiesProps {
  selectedUserServices: UserServiceItemFragment[];
  availableCapabilities: BadgeOverflow[];
  open: boolean;
  setOpen: (open: boolean) => void;
  serviceInstanceId: string;
  onCompleted?: () => void;
}

export const SubscriptionSlugAddCapabilities = ({
  selectedUserServices,
  availableCapabilities,
  open,
  setOpen,
  serviceInstanceId,
  onCompleted,
}: SubscriptionSlugAddCapabilitiesProps) => {
  const t = useTranslate();
  const [selectedCapabilityIds, setSelectedCapabilityIds] = useState<
    Set<string>
  >(new Set());

  const queryClient = useQueryClient();
  const { mutate: addCapabilities } = useAddCapabilitiesToUserServicesMutation(
    portalGraphqlClient,
    {
      onSuccess: async () => {
        await invalidateUserServiceQueries(queryClient);
        resetAndClose();
        onCompleted?.();
      },
      onError: (error: Error) => {
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: <>{t(`Error.Server.${error.message}`)}</>,
        });
      },
    }
  );

  const toggleCapability = (id: string) => {
    setSelectedCapabilityIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const resetAndClose = () => {
    setSelectedCapabilityIds(new Set());
    setOpen(false);
  };

  const handleSubmit = () => {
    const capabilities = Array.from(selectedCapabilityIds);

    addCapabilities({
      input: {
        userServiceIds: selectedUserServices.map((us) => us.id),
        capabilities,
      },
      service_instance_id: serviceInstanceId,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) resetAndClose();
        else setOpen(value);
      }}>
      <DialogContent>
        <DialogTitle>
          {t('Service.Management.AddUserServiceCapabilities.Title')}
        </DialogTitle>

        <DialogBody>
          <p className="text-sm text-default-secondary">
            {t('Service.Management.AddUserServiceCapabilities.Description', {
              count: selectedUserServices.length,
            })}
          </p>

          <div className="flex flex-col gap-2 py-3">
            {availableCapabilities.length === 0 ? (
              <p className="text-sm text-default-secondary italic">
                {t('Service.Management.NoAvailableCapabilities')}
              </p>
            ) : (
              availableCapabilities.map((capability) => (
                <Checkbox
                  key={capability.id}
                  label={capability.name}
                  checked={selectedCapabilityIds.has(capability.id)}
                  onCheckedChange={() => toggleCapability(capability.id)}
                />
              ))
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            {...analyticsId('subscription_bulk_capabilities_cancel')}
            priority="tertiary"
            onClick={() => resetAndClose()}>
            {t('Utils.Cancel')}
          </Button>
          <Button
            {...analyticsId('subscription_bulk_capabilities_submit')}
            disabled={selectedCapabilityIds.size === 0}
            onClick={handleSubmit}>
            {t('Utils.Validate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
