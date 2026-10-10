'use client';

import { MeRequestTransferPersonalSpaceMutation } from '@/components/me/me.graphql';
import { AutoForm } from '@/components/ui/auto-form';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Separator } from '@/components/ui/separator';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@filigran/design-system';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation } from 'react-relay';
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
  const [commitTransferPersonalSpaceMutation] = useMutation(
    MeRequestTransferPersonalSpaceMutation
  );

  const onSubmit = (values: RequestTransferPersonalSpaceSchema) => {
    setIsDialogOpen(true);
    setPendingValues(values);
  };

  const confirmEdition = () => {
    setIsDialogOpen(false);
    commitTransferPersonalSpaceMutation({
      variables: {
        new_email: pendingValues?.new_email,
      },
      onError(error) {
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: t(`Error.Server.${error.message}`),
        });
      },
      onCompleted() {
        showSnackbar({
          severity: 'success',
          title: t('Utils.Success'),
          description: t('ProfilePage.PersonalSpace.SuccessRequest'),
        });
        router.push('/app');
      },
    });
  };
  return (
    <>
      <Separator className="my-s" />
      <h2 className="text-destructive">{t('Utils.DangerZone')}</h2>
      <Card>
        <CardHeader>
          <CardTitle as="h3">
            {t('ProfilePage.PersonalSpace.TitleDangerZone')}
          </CardTitle>
        </CardHeader>
        <CardContent clamp={0}>
          {t('ProfilePage.PersonalSpace.TransferPersoSpaceExplanation')}
          <AutoForm
            className="mt-xl"
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
            <div className="mt-xl flex justify-end">
              <Button
                variant="destructive"
                aria-label={t('ProfilePage.PersonalSpace.TransferPersoSpace')}>
                {t('ProfilePage.PersonalSpace.Transfer')}
              </Button>
            </div>
          </AutoForm>
        </CardContent>
      </Card>
      <ConfirmDialog
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
