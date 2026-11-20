import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { FiligranLoader } from '@filigran/icon';
import { useMePersonalSpaceTransferMutation } from '@graphql/generated';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface TransferPersonalSpaceProps {
  requestId: string | null;
}

export const TransferPersonalSpace = ({
  requestId,
}: TransferPersonalSpaceProps) => {
  const router = useRouter();

  const t = useTranslate();
  const { mutate: transferPersonalSpace } =
    useMePersonalSpaceTransferMutation<Error>(portalGraphqlClient, {
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
          title: t('ProfilePage.PersonalSpace.SuccessTransfer'),
        });

        router.push('/app');
      },
    });
  useEffect(() => {
    if (requestId) {
      transferPersonalSpace({ requestId });
    }
  }, [requestId, transferPersonalSpace]);
  return (
    <div className="absolute inset-0 z-50 m-auto h-20 w-20">
      <FiligranLoader />
    </div>
  );
};
