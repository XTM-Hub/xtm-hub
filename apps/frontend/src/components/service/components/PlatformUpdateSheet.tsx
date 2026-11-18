'use client';

import { invalidatePrivateNavigationQueries } from '@/components/menu/navigation/private/private-navigation-query-invalidation';
import {
  ServiceDefinitionIdentifierToPlatformIdentifier,
  translateServiceDefinitionIdentifier,
} from '@/components/registration/PlatformIdentifierMapping';
import { Form, FormField } from '@/components/ui/form';
import { SheetFooter } from '@/components/ui/sheet';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsProduct } from '@/lib/analytics/analytics.context';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { Button, Input } from '@filigran/design-system';
import { ServiceDefinitionIdentifier } from '@generated/serviceInstance_fragment.graphql';
import { useUpdatePlatformServiceMetadataMutation } from '@graphql/generated';
import { registrationKeys } from '@graphql/registration/registration.keys';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const platformUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

interface PlatformUpdateSheetProps {
  serviceInstanceId: string;
  serviceInstanceName: string;
  platformUrl: string;
  serviceDefinitionIdentifier: ServiceDefinitionIdentifier;
  open: boolean;
  setOpen: (open: boolean) => void;
  onUpdated?: () => void;
}

export const PlatformUpdateSheet = ({
  serviceInstanceId,
  serviceInstanceName,
  platformUrl,
  serviceDefinitionIdentifier,
  open,
  setOpen,
  onUpdated,
}: PlatformUpdateSheetProps) => {
  const t = useTranslate();
  const queryClient = useQueryClient();
  const platformIdentifier =
    ServiceDefinitionIdentifierToPlatformIdentifier[
      serviceDefinitionIdentifier
    ];

  // Hook-level callbacks still run when the sheet unmounts before the request
  // settles, unlike the per-call ones, so the caches never keep the old name.
  const { mutate: updatePlatformMetadata } =
    useUpdatePlatformServiceMetadataMutation(portalGraphqlClient, {
      onSuccess: () => {
        invalidatePrivateNavigationQueries(queryClient);
        // The registered platform page shows the name.
        void queryClient.invalidateQueries({
          queryKey: registrationKeys.allByServiceInstance(),
        });
        onUpdated?.();
      },
    });

  const form = useForm<z.infer<typeof platformUpdateSchema>>({
    resolver: zodResolver(platformUpdateSchema),
    defaultValues: {
      name: serviceInstanceName,
    },
  });

  const onSubmit = (values: z.infer<typeof platformUpdateSchema>) => {
    updatePlatformMetadata(
      {
        input: {
          serviceInstanceId: serviceInstanceId,
          name: values.name,
        },
      },
      {
        onSuccess: () => {
          setOpen(false);
          showSnackbar({
            severity: 'success',
            title: t('Utils.Success'),
            description: t('Platform.Updated', {
              platformName: values.name,
            }),
          });
          form.reset({
            name: values.name,
          });
        },
        onError: (error) => {
          showSnackbar({
            severity: 'error',
            title: t('Utils.Error'),
            description: t(
              `Error.Server.${error instanceof Error ? error.message : 'UNKNOWN_ERROR'}`
            ),
          });
        },
      }
    );
  };

  // Get platform name for display
  const getPlatformName = () => {
    return translateServiceDefinitionIdentifier(serviceDefinitionIdentifier);
  };

  return (
    <SheetWithPreventingDialog
      open={open}
      setOpen={setOpen}
      analyticsContext={
        platformIdentifier && analyticsProduct(platformIdentifier)
      }
      title={t('Platform.UpdateMetadata', { platformName: getPlatformName() })}>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Input
                label={t('Platform.Name')}
                placeholder={t('Platform.NamePlaceholder')}
                error={fieldState.error?.message}
                {...field}
              />
            )}
          />

          <Input
            label={t('Register.Details.ProductURL')}
            value={platformUrl}
            disabled
          />

          <SheetFooter>
            <Button
              {...analyticsId('platform_name_cancel')}
              type="button"
              priority="secondary"
              onClick={() => setOpen(false)}>
              {t('Utils.Cancel')}
            </Button>
            <Button
              {...analyticsId('platform_name_submit')}
              type="submit"
              disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? t('Utils.Updating')
                : t('Utils.Update')}
            </Button>
          </SheetFooter>
        </form>
      </Form>
    </SheetWithPreventingDialog>
  );
};
