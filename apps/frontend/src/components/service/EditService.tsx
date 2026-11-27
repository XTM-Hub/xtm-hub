import {
  newPicturesSchema,
  ServiceForm,
} from '@/components/service/ServiceForm';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { requestGraphqlWithUploads } from '@/lib/graphql-upload-client';
import {
  AddServicePictureDocument,
  type AddServicePictureMutation,
  type AddServicePictureMutationVariables,
  type AdminServiceInstanceItemFragment,
} from '@graphql/generated';
import { adminServiceInstancesKeys } from '@graphql/service-instances/service-instances.keys';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

interface EditServiceProps {
  service?: AdminServiceInstanceItemFragment;
  open: boolean;
  setOpen: (open: boolean) => void;
}

interface ServicePictureUpload {
  serviceInstanceId: string;
  picture: File;
  isLogo: boolean;
}

export const EditService = ({ service, open, setOpen }: EditServiceProps) => {
  const t = useTranslate();
  const queryClient = useQueryClient();

  // The logo and the illustration are two uploads of the same mutation: the
  // hook callbacks run for each of them, `mutate` ones only for the last one.
  const { mutate: addServicePicture } = useMutation({
    mutationFn: ({
      serviceInstanceId,
      picture,
      isLogo,
    }: ServicePictureUpload) =>
      requestGraphqlWithUploads<
        AddServicePictureMutation,
        AddServicePictureMutationVariables
      >(
        AddServicePictureDocument,
        { serviceInstanceId, document: null, isLogo },
        { document: picture }
      ),
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: adminServiceInstancesKeys.all(),
      });
      setOpen(false);
      showSnackbar({
        severity: 'success',
        title: t('Utils.Success'),
        description: t('ServiceForm.PictureUpdated', {
          // The schema lets the mutation answer null: the message then names
          // the service being edited instead.
          serviceName: response.addServicePicture?.name ?? service?.name ?? '',
        }),
      });
    },
    onError: (error) => {
      showSnackbar({
        severity: 'error',
        title: t('Utils.Error'),
        description: t(`Error.Server.${error.message}`),
      });
    },
  });

  const pictureMutation = (document: FileList | undefined, isLogo: boolean) => {
    const [picture] = Array.from(document ?? []);
    if (!service || !picture) {
      return;
    }
    addServicePicture({ serviceInstanceId: service.id, picture, isLogo });
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
