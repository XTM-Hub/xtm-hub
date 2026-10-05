'use client';

import { PortalContext } from '@/components/me/AppPortalContext';
import {
  MeEditUserMutation,
  MeResetPasswordMutation,
  MeUploadUserPictureMutation,
} from '@/components/me/me.graphql';
import {
  ProfileFormEdit,
  ProfileFormEditSchema,
} from '@/components/profile/form/Edit';
import { ProfileFormPicture } from '@/components/profile/form/Picture';
import { ProfileFormPreferences } from '@/components/profile/form/Preferences';
import { RequestTransferPersonalSpace } from '@/components/profile/form/RequestTransferPersonalSpace';
import { ProfileFormResetPassword } from '@/components/profile/form/ResetPassword';
import { AlertDialogComponent } from '@/components/ui/AlertDialog';
import { useTranslate } from '@/hooks/use-translate';
import { fileListToUploadableMap } from '@/relay/environment/fetch-form-data';
import { toast } from '@filigran/ui';
import { useContext, useState } from 'react';
import { useMutation } from 'react-relay';

export const Profile = () => {
  const t = useTranslate();
  const { me } = useContext(PortalContext);
  const [commitResetPasswordMutation] = useMutation(MeResetPasswordMutation);
  const [commitEditMeUserMutation] = useMutation(MeEditUserMutation);
  const [commitUploadPictureMutation] = useMutation(
    MeUploadUserPictureMutation
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<ProfileFormEditSchema>();

  const handleSubmit = (values: ProfileFormEditSchema) => {
    if (
      values.first_name !== me?.first_name ||
      values.last_name !== me?.last_name
    ) {
      setPendingValues(values);
      setIsDialogOpen(true);
      return;
    }

    editUser(values);
  };

  const confirmEdition = () => {
    setIsDialogOpen(false);
    if (!pendingValues) {
      return;
    }

    editUser(pendingValues);
    setPendingValues({});
  };

  const editUser = (values: ProfileFormEditSchema) => {
    commitEditMeUserMutation({
      variables: values,
      onCompleted() {
        toast({
          title: t('Utils.Success'),
        });
      },
      onError(error) {
        toast({
          variant: 'destructive',
          title: t('Utils.Error'),
          description: t(`Error.Server.${error.message}`),
        });
      },
    });
  };
  const handleUploadPicture = (files: (File | null)[]) => {
    commitUploadPictureMutation({
      variables: { document: null },
      uploadables: fileListToUploadableMap(files),
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
        });
      },
    });
  };

  const handleResetPassword = () => {
    commitResetPasswordMutation({
      variables: {},
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
          description: t('UserForm.ResetPassword.Success'),
        });
      },
    });
  };

  return (
    <>
      <section className="flex flex-col gap-xl m-auto w-full sm:w-10/12 md:w-8/12">
        <ProfileFormEdit onSubmit={handleSubmit} />
        <ProfileFormPreferences />
        <ProfileFormPicture onSubmit={handleUploadPicture} />
        <ProfileFormResetPassword onSubmit={handleResetPassword} />
        <RequestTransferPersonalSpace />
      </section>
      <AlertDialogComponent
        isOpen={isDialogOpen}
        AlertTitle={t('DialogActions.ContinueTitle')}
        actionButtonText={t('MenuActions.Continue')}
        onOpenChange={setIsDialogOpen}
        onClickContinue={confirmEdition}>
        {t('ProfilePage.PlatformsEditionDialog.ConfirmSentence')}
      </AlertDialogComponent>
    </>
  );
};
