'use client';

import { MeRequestTransferPersonalSpaceMutation } from '@/components/me/me.graphql';
import { AlertDialogComponent } from '@/components/ui/AlertDialog';
import { useTranslate } from '@/hooks/use-translate';
import {
  AutoForm,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
  toast,
} from '@filigran/ui';
import { Button } from '@filigran/ui/servers';
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
        toast({
          variant: 'destructive',
          title: t('Utils.Error'),
          description: t(`Error.Server.${error.message}`),
        });
      },
      onCompleted() {
        toast({
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
      <Card className="border-2 border-red">
        <CardHeader>
          <CardTitle className="heading-lg">
            {t('ProfilePage.PersonalSpace.TitleDangerZone')}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                variant={'destructive'}
                aria-label={t('ProfilePage.PersonalSpace.TransferPersoSpace')}>
                {t('ProfilePage.PersonalSpace.Transfer')}
              </Button>
            </div>
          </AutoForm>
        </CardContent>
      </Card>
      <AlertDialogComponent
        isOpen={isDialogOpen}
        AlertTitle={t('DialogActions.ContinueTitle')}
        actionButtonText={t('MenuActions.Continue')}
        variantName={'destructive'}
        onOpenChange={setIsDialogOpen}
        onClickContinue={confirmEdition}>
        {t('ProfilePage.PersonalSpace.TransferConfirmSentence')}
      </AlertDialogComponent>
    </>
  );
};
