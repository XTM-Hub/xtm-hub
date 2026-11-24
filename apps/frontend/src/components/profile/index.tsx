'use client';

import { PortalContext } from '@/components/me/AppPortalContext';
import { setCurrentUser } from '@/components/me/current-user-query';
import { ProfileApiTokens } from '@/components/profile/api-tokens/ProfileApiTokens';
import {
  ProfileFormEdit,
  ProfileFormEditSchema,
} from '@/components/profile/form/Edit';
import { ProfileFormPicture } from '@/components/profile/form/Picture';
import { ProfileFormPreferences } from '@/components/profile/form/Preferences';
import { RequestTransferPersonalSpace } from '@/components/profile/form/RequestTransferPersonalSpace';
import { ProfileFormResetPassword } from '@/components/profile/form/ResetPassword';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { requestGraphqlWithUploads } from '@/lib/graphql-upload-client';
import {
  CurrentUserFragment,
  MePictureUploadDocument,
  MePictureUploadMutation,
  MePictureUploadMutationVariables,
  useMePasswordResetMutation,
  useMeProfileEditMutation,
} from '@graphql/generated';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useContext, useState } from 'react';

export const Profile = () => {
  const t = useTranslate();
  const { me } = useContext(PortalContext);
  const queryClient = useQueryClient();
  const showError = (error: Error) => {
    showSnackbar({
      severity: 'error',
      title: t('Utils.Error'),
      description: t(`Error.Server.${error.message}`),
    });
  };
  const handleUserUpdated = (user: CurrentUserFragment) => {
    setCurrentUser(queryClient, user);
    showSnackbar({
      severity: 'success',
      title: t('Utils.Success'),
    });
  };

  const { mutate: resetPassword } = useMePasswordResetMutation<Error>(
    portalGraphqlClient,
    {
      onError: showError,
      onSuccess() {
        showSnackbar({
          severity: 'success',
          title: t('Utils.Success'),
          description: t('UserForm.ResetPassword.Success'),
        });
      },
    }
  );
  const { mutate: editMeUser } = useMeProfileEditMutation<Error>(
    portalGraphqlClient,
    {
      onError: showError,
      onSuccess: ({ editMeUser: user }) => handleUserUpdated(user),
    }
  );
  const { mutate: uploadPicture } = useMutation({
    mutationFn: (picture: File) =>
      requestGraphqlWithUploads<
        MePictureUploadMutation,
        MePictureUploadMutationVariables
      >(MePictureUploadDocument, { document: null }, { document: picture }),
    onError: showError,
    onSuccess: ({ uploadUserPicture: user }) => handleUserUpdated(user),
  });
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
    editMeUser({
      first_name: values.first_name ?? null,
      last_name: values.last_name ?? null,
      country: values.country ?? null,
    });
  };
  const handleUploadPicture = ([picture]: (File | null)[]) => {
    if (picture) {
      uploadPicture(picture);
    }
  };

  const handleResetPassword = () => {
    resetPassword({});
  };

  return (
    <>
      <section className="flex flex-col gap-6 m-auto w-full sm:w-10/12 md:w-8/12">
        <ProfileFormEdit onSubmit={handleSubmit} />
        <ProfileFormPreferences />
        <ProfileFormPicture onSubmit={handleUploadPicture} />
        <ProfileFormResetPassword onSubmit={handleResetPassword} />
        <ProfileApiTokens />
        <RequestTransferPersonalSpace />
      </section>
      <ConfirmDialog
        confirmAnalyticsId="account_profile_update_confirm"
        open={isDialogOpen}
        title={t('DialogActions.ContinueTitle')}
        confirmLabel={t('MenuActions.Continue')}
        onOpenChange={setIsDialogOpen}
        onConfirm={confirmEdition}>
        {t('ProfilePage.PlatformsEditionDialog.ConfirmSentence')}
      </ConfirmDialog>
    </>
  );
};
