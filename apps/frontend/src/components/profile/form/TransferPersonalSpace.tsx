import { MeTransferPersonalSpaceMutation } from '@/components/me/me.graphql';
import { useTranslate } from '@/hooks/use-translate';
import { FiligranLoader } from '@filigran/icon';
import { toast } from '@filigran/ui';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useMutation } from 'react-relay';

interface TransferPersonalSpaceProps {
  requestId: string | null;
}

export const TransferPersonalSpace = ({
  requestId,
}: TransferPersonalSpaceProps) => {
  const router = useRouter();

  const t = useTranslate();
  const [commitTransferPersonalSpaceMutation] = useMutation(
    MeTransferPersonalSpaceMutation
  );
  useEffect(() => {
    if (requestId) {
      commitTransferPersonalSpaceMutation({
        variables: {
          requestId,
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
            title: t('ProfilePage.PersonalSpace.SuccessTransfer'),
          });

          router.push('/app');
        },
      });
    }
  }, [requestId, commitTransferPersonalSpaceMutation, router, t]);
  return (
    <div className="absolute inset-0 z-50 m-auto h-20 w-20">
      <FiligranLoader />
    </div>
  );
};
