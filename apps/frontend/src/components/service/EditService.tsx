import { ServiceAddPicture } from '@/components/service/service.graphql';
import {
  newPicturesSchema,
  ServiceForm,
} from '@/components/service/ServiceForm';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import { fileListToUploadableMap } from '@/relay/environment/fetch-form-data';
import { useToast } from '@filigran/ui';
import { serviceAddPictureMutation } from '@generated/serviceAddPictureMutation.graphql';
import { serviceList_fragment$data } from '@generated/serviceList_fragment.graphql';
import { useMutation } from 'react-relay';
import { z } from 'zod';

interface EditServiceProps {
  service: serviceList_fragment$data;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const EditService = ({ service, open, setOpen }: EditServiceProps) => {
  const t = useTranslate();
  const { toast } = useToast();

  const [servicePictureMutation] =
    useMutation<serviceAddPictureMutation>(ServiceAddPicture);

  const pictureMutation = (document: FileList | undefined, isLogo: boolean) => {
    if (!document) {
      return;
    }
    servicePictureMutation({
      variables: {
        serviceInstanceId: service.id,
        document: document,
        isLogo: isLogo,
      },
      uploadables: fileListToUploadableMap(document),
      onCompleted: (response) => {
        setOpen(false);
        toast({
          title: t('Utils.Success'),
          description: t('ServiceForm.PictureUpdated', {
            serviceName: response.addServicePicture!.name,
          }),
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
  const handleSubmit = (values: z.infer<typeof newPicturesSchema>) => {
    pictureMutation(values.logo_document, true);
    pictureMutation(values.illustration_document, false);
  };
  return (
    <SheetWithPreventingDialog
      open={open}
      setOpen={setOpen}
      title={t('ServiceForm.EditService')}>
      <ServiceForm handleSubmit={handleSubmit} />
    </SheetWithPreventingDialog>
  );
};
