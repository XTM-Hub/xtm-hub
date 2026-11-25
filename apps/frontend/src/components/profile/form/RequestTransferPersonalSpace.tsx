'use client';

import { AutoForm } from '@/components/ui/auto-form';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Separator } from '@/components/ui/separator';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@filigran/design-system';
import { useMePersonalSpaceTransferRequestMutation } from '@graphql/generated';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';

const formSchema = z.object({
  new_email: z.string().email('This is not a valid email.'),
});
export type RequestTransferPersonalSpaceSchema = z.infer<typeof formSchema>;

export const RequestTransferPersonalSpace = () => {
  const router = useRouter();
  const t = useTranslate();
  const [pendingValues, setPendingValues] =
    useState<RequestTransferPersonalSpaceSchema>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { mutate: requestTransferPersonalSpace } =
    useMePersonalSpaceTransferRequestMutation<Error>(portalGraphqlClient, {
      onError(error) {
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: t(`Error.Server.${error.message}`),
        });
      },
      onSuccess() {
        showSnackbar({
          severity: 'success',
          title: t('Utils.Success'),
          description: t('ProfilePage.PersonalSpace.SuccessRequest'),
        });
        router.push('/app');
      },
    });

  const onSubmit = (values: RequestTransferPersonalSpaceSchema) => {
    setIsDialogOpen(true);
    setPendingValues(values);
  };

  const confirmEdition = () => {
    setIsDialogOpen(false);
    if (!pendingValues) {
      return;
    }

    requestTransferPersonalSpace({ new_email: pendingValues.new_email });
  };
  return (
    <>
      <Separator className="my-2" />
      <h2 className="text-feedback-error-primary">{t('Utils.DangerZone')}</h2>
      <Card>
        <CardHeader>
          <CardTitle as="h3">
            {t('ProfilePage.PersonalSpace.TitleDangerZone')}
          </CardTitle>
        </CardHeader>
        <CardContent clamp={0}>
          {t('ProfilePage.PersonalSpace.TransferPersoSpaceExplanation')}
          <AutoForm
            className="mt-6"
            onSubmit={(values) => onSubmit(values)}
            formSchema={formSchema}
            fieldConfig={{
              new_email: {
                label: t('UserListPage.UserForm.Email'),
                inputProps: {
                  placeholder: t('ProfilePage.PersonalSpace.EmailPlaceholder'),
                },
              },
            }}>
            <div className="mt-6 flex justify-end">
              <Button
                {...analyticsId('account_personal_space_submit')}
                variant="destructive"
                aria-label={t('ProfilePage.PersonalSpace.TransferPersoSpace')}>
                {t('ProfilePage.PersonalSpace.Transfer')}
              </Button>
            </div>
          </AutoForm>
        </CardContent>
      </Card>
      <ConfirmDialog
        confirmAnalyticsId="account_personal_space_transfer_confirm"
        open={isDialogOpen}
        title={t('DialogActions.ContinueTitle')}
        confirmLabel={t('MenuActions.Continue')}
        destructive
        onOpenChange={setIsDialogOpen}
        onConfirm={confirmEdition}>
        {t('ProfilePage.PersonalSpace.TransferConfirmSentence')}
      </ConfirmDialog>
    </>
  );
};
