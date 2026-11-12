import { invalidateSubscriptionQueries } from '@/components/subcription/subscription.invalidation';
import { BadgeOverflow } from '@/components/ui/BadgeOverflowCounter';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { portalGraphqlClient } from '@/lib/graphql-client';
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
  SubscriptionItemFragment,
  useAddSubscriptionCapabilityMutation,
} from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

interface ServiceSlugAddCapabilitiesProps {
  selectedSubscriptions: SubscriptionItemFragment[];
  availableCapabilities: BadgeOverflow[];
  open: boolean;
  setOpen: (open: boolean) => void;
  onCompleted?: () => void;
}

export const ServiceSlugAddCapabilities = ({
  selectedSubscriptions,
  availableCapabilities,
  open,
  setOpen,
  onCompleted,
}: ServiceSlugAddCapabilitiesProps) => {
  const t = useTranslate();
  const [selectedCapabilityIds, setSelectedCapabilityIds] = useState<
    Set<string>
  >(new Set());

  const queryClient = useQueryClient();

  const { mutate: addCapability, isPending } =
    useAddSubscriptionCapabilityMutation(portalGraphqlClient, {
      onSuccess: async () => {
        await invalidateSubscriptionQueries(queryClient);
        resetAndClose();
        onCompleted?.();
      },
      onError: (error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : 'UNKNOWN_ERROR';
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: <>{t(`Error.Server.${errorMessage}`)}</>,
        });
      },
    });

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
    const capabilitiesId = Array.from(selectedCapabilityIds);

    addCapability({
      input: {
        subscriptionsId: selectedSubscriptions.map(
          (subscription) => subscription.id
        ),
        capabilitiesId,
      },
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
          {t('Service.Management.AddSubscriptionCapabilities.Title')}
        </DialogTitle>

        <DialogBody>
          <p className="text-sm text-default-secondary">
            {t('Service.Management.AddSubscriptionCapabilities.Description', {
              count: selectedSubscriptions.length,
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
            {...analyticsId('admin_form_cancel')}
            priority="tertiary"
            onClick={() => resetAndClose()}>
            {t('Utils.Cancel')}
          </Button>
          <Button
            {...analyticsId('admin_subscription_capability_confirm')}
            disabled={selectedCapabilityIds.size === 0 || isPending}
            onClick={handleSubmit}>
            {t('Utils.Validate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
