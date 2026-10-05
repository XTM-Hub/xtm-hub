import { UserServicesAddCapabilitiesMutation } from '@/components/service/user_service.graphql';
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
import { userServices_fragment$data } from '@generated/userServices_fragment.graphql';
import { userServicesAddCapabilitiesMutation } from '@generated/userServicesAddCapabilitiesMutation.graphql';
import { useState } from 'react';
import { useMutation } from 'react-relay';

interface SubscriptionSlugAddCapabilitiesProps {
  selectedUserServices: userServices_fragment$data[];
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

  const [commitAddCapabilities] =
    useMutation<userServicesAddCapabilitiesMutation>(
      UserServicesAddCapabilitiesMutation
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

    commitAddCapabilities({
      variables: {
        input: {
          userServiceIds: selectedUserServices.map((us) => us.id),
          capabilities,
        },
        service_instance_id: serviceInstanceId,
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
            {t('Service.Management.AddUserServiceCapabilities.Title')}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {t('Service.Management.AddUserServiceCapabilities.Description', {
            count: selectedUserServices.length,
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
            disabled={selectedCapabilityIds.size === 0}
            onClick={handleSubmit}>
            {t('Utils.Validate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
