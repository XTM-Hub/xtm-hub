import { AddSubscriptionCapabilityMutation } from '@/components/subcription/subscription.graphql';
import { BadgeOverflow } from '@/components/ui/BadgeOverflowCounter';
import { useTranslate } from '@/hooks/use-translate';
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from '@filigran/ui';
import { subscriptionAddCapabilityMutation } from '@generated/subscriptionAddCapabilityMutation.graphql';
import { subscription_fragment$data } from '@generated/subscription_fragment.graphql';
import { useState } from 'react';
import { useMutation } from 'react-relay';

interface ServiceSlugAddCapabilitiesProps {
  selectedSubscriptions: subscription_fragment$data[];
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

  const [commitAddCapability, isInFlight] =
    useMutation<subscriptionAddCapabilityMutation>(
      AddSubscriptionCapabilityMutation
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
    const capabilitiesId = Array.from(selectedCapabilityIds);

    commitAddCapability({
      variables: {
        input: {
          subscriptionsId: selectedSubscriptions.map(
            (subscription) => subscription.id
          ),
          capabilitiesId,
        },
      },
      onCompleted: () => {
        resetAndClose();
        onCompleted?.();
      },
      onError: (error: Error) => {
        toast({
          variant: 'destructive',
          title: t('Utils.Error'),
          description: <>{t(`Error.Server.${error.message}`)}</>,
        });
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
        <DialogHeader>
          <DialogTitle>
            {t('Service.Management.AddSubscriptionCapabilities.Title')}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {t('Service.Management.AddSubscriptionCapabilities.Description', {
            count: selectedSubscriptions.length,
          })}
        </p>

        <div className="flex flex-col gap-s py-m">
          {availableCapabilities.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              {t('Service.Management.NoAvailableCapabilities')}
            </p>
          ) : (
            availableCapabilities.map((capability) => (
              <label
                key={capability.id}
                className="flex items-center gap-s cursor-pointer">
                <Checkbox
                  checked={selectedCapabilityIds.has(capability.id)}
                  onCheckedChange={() => toggleCapability(capability.id)}
                />
                <span className="text-sm">{capability.name}</span>
              </label>
            ))
          )}
        </div>

        <DialogFooter>
          <Button
            variant="tertiary"
            onClick={() => resetAndClose()}>
            {t('Utils.Cancel')}
          </Button>
          <Button
            disabled={selectedCapabilityIds.size === 0 || isInFlight}
            onClick={handleSubmit}>
            {t('Utils.Validate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
