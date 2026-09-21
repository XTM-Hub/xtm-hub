import { trialsRegionKey } from '@/components/trials/trials.const';
import { AlertDialogComponent } from '@/components/ui/AlertDialog';
import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { isEmpty } from '@/lib/utils';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  SheetFooter,
} from '@filigran/ui';
import { toast } from '@filigran/ui/clients';
import { Input } from '@filigran/ui/servers';
import { trialsQuotasKeys } from '@graphql/deployment/deployment.keys';
import {
  DeploymentRequestPlatformRegion,
  TrialsQuotaFragment,
  useTrialsUpdateDeploymentQuotaCapacityMutation,
} from '@graphql/generated';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

interface TrialsTabQuotasPlatformUpdateFormProps {
  quota: TrialsQuotaFragment;
  callback: () => void;
}

const formSchema = z.object({
  region: z.enum(DeploymentRequestPlatformRegion),
  newCapacity: z.int().min(0),
});

export const TrialsTabQuotasPlatformUpdateForm = ({
  quota,
  callback,
}: TrialsTabQuotasPlatformUpdateFormProps) => {
  const t = useTranslations();
  const { handleCloseSheet, setIsDirty } = useDialogContext();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      region: quota.region,
      newCapacity: quota.capacity,
    },
  });

  setIsDirty(!isEmpty(form.formState.dirtyFields));

  const queryClient = useQueryClient();
  const { mutate: updateQuotaMutation } =
    useTrialsUpdateDeploymentQuotaCapacityMutation(portalGraphqlClient, {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trialsQuotasKeys.all(),
        });
        toast({
          title: t('Utils.Success'),
          description: t('TrialsDashboard.UpdateQuotasForm.QuotasUpdated'),
        });
        callback();
      },
      onError: (error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : 'UnknownError';
        toast({
          variant: 'destructive',
          title: t('Utils.Error'),
          description: t(`Error.Server.${errorMessage}`),
        });
      },
    });
  const [values, setValues] = useState<z.infer<typeof formSchema>>();
  const updateQuota = () => {
    if (!values) {
      return;
    }
    updateQuotaMutation({ input: values });
  };

  const onSubmit = (newValues: z.infer<typeof formSchema>) => {
    setValues(newValues);
  };
  const translatedRegion = t(trialsRegionKey(quota.region));

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full space-y-xl">
          <FormField
            control={form.control}
            name="newCapacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('TrialsDashboard.UpdateQuotasForm.NewCapacityLabel')}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t(
                      'TrialsDashboard.UpdateQuotasForm.NewCapacityLabel'
                    )}
                    type="number"
                    min={0}
                    onChange={(event) =>
                      field.onChange(Number.parseInt(event.target.value, 10))
                    }
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <SheetFooter className="justify-end pb-0">
            <div className="flex gap-s">
              <Button
                variant="secondary"
                type="button"
                onClick={(e) => handleCloseSheet(e)}>
                {t('Utils.Cancel')}
              </Button>
              <AlertDialogComponent
                AlertTitle={t(
                  'TrialsDashboard.UpdateQuotasForm.AlertDialog.ConfirmTitle',
                  {
                    region: translatedRegion,
                  }
                )}
                actionButtonText={t('Utils.Validate')}
                triggerElement={
                  <Button
                    disabled={!form.formState.isValid}
                    type="submit">
                    {t('Utils.Validate')}
                  </Button>
                }
                onClickContinue={() => updateQuota()}>
                <p>
                  {t(
                    'TrialsDashboard.UpdateQuotasForm.AlertDialog.ConfirmDescription',
                    {
                      region: translatedRegion,
                      oldCapacity: quota.capacity,
                      newCapacity: values?.newCapacity ?? 0,
                    }
                  )}
                  <br />
                  {t(
                    'TrialsDashboard.UpdateQuotasForm.AlertDialog.ConfirmSentence'
                  )}
                </p>
              </AlertDialogComponent>
            </div>
          </SheetFooter>
        </form>
      </Form>
    </>
  );
};
