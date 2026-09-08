'use client';

import { invalidatePrivateNavigationQueries } from '@/components/menu/navigation/private/private-navigation-query-invalidation';
import { translateServiceDefinitionIdentifier } from '@/components/registration/PlatformIdentifierMapping';
import { UpdatePlatformServiceMetadata } from '@/components/service/service.graphql';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  SheetFooter,
  useToast,
} from '@filigran/ui';
import { ServiceDefinitionIdentifier } from '@generated/serviceInstance_fragment.graphql';
import { serviceUpdatePlatformServiceMetadataMutation } from '@generated/serviceUpdatePlatformServiceMetadataMutation.graphql';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { useMutation } from 'react-relay';
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
  const t = useTranslations();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [updatePlatformMetadata] =
    useMutation<serviceUpdatePlatformServiceMetadataMutation>(
      UpdatePlatformServiceMetadata
    );

  const form = useForm<z.infer<typeof platformUpdateSchema>>({
    resolver: zodResolver(platformUpdateSchema),
    defaultValues: {
      name: serviceInstanceName,
    },
  });

  const onSubmit = (values: z.infer<typeof platformUpdateSchema>) => {
    updatePlatformMetadata({
      variables: {
        input: {
          serviceInstanceId: serviceInstanceId,
          name: values.name,
        },
      },
      onCompleted: () => {
        setOpen(false);
        invalidatePrivateNavigationQueries(queryClient);
        onUpdated?.();
        toast({
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
        toast({
          variant: 'destructive',
          title: t('Utils.Error'),
          description: t(`Error.Server.${error.message}`),
        });
      },
    });
  };

  // Get platform name for display
  const getPlatformName = () => {
    return translateServiceDefinitionIdentifier(serviceDefinitionIdentifier);
  };

  return (
    <SheetWithPreventingDialog
      open={open}
      setOpen={setOpen}
      title={t('Platform.UpdateMetadata', { platformName: getPlatformName() })}>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-l">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Platform.Name')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('Platform.NamePlaceholder')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem>
            <FormLabel>{t('Register.Details.ProductURL')}</FormLabel>
            <FormControl>
              <Input
                value={platformUrl}
                disabled
              />
            </FormControl>
          </FormItem>

          <SheetFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}>
              {t('Utils.Cancel')}
            </Button>
            <Button
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
