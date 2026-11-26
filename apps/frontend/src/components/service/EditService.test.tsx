import { EditService } from '@/components/service/EditService';
import * as SnackbarStore from '@/components/ui/snackbar/snackbar-store';
import { requestGraphqlWithUploads } from '@/lib/graphql-upload-client';
import testRender from '@/utils/test/test-render';
import {
  AddServicePictureDocument,
  type AddServicePictureMutation,
  type AdminServiceInstanceItemFragment,
} from '@graphql/generated';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/graphql-upload-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/graphql-upload-client')>()),
  requestGraphqlWithUploads: vi.fn(),
}));

const SERVICE_ID = 'service-instance-1';
const SERVICE_NAME = 'OpenCTI playbooks';
const LOGO_LABEL = 'ServiceForm.Logo';
const ILLUSTRATION_LABEL = 'ServiceForm.Illustration';
const VALIDATE_LABEL = /Utils.Validate/;
const SERVER_ERROR = 'SERVICE_PICTURE_UPLOAD_FAILED';

const SERVICE: AdminServiceInstanceItemFragment = {
  id: SERVICE_ID,
  name: SERVICE_NAME,
  description: null,
  creation_status: null,
  capabilities: [],
  public: true,
  tags: null,
  links: null,
  service_definition: null,
  logo_document_id: null,
  illustration_document_id: null,
  slug: null,
  ordering: 0,
};

const RESPONSE: AddServicePictureMutation = {
  addServicePicture: { id: SERVICE_ID, name: SERVICE_NAME },
};

const makePicture = (name: string) =>
  new File(['image'], name, { type: 'image/png' });

const renderEditService = () => {
  const setOpen = vi.fn();
  return {
    setOpen,
    ...testRender(
      <EditService
        service={SERVICE}
        open
        setOpen={setOpen}
      />
    ),
  };
};

const uploadPicture = async (
  user: ReturnType<typeof testRender>['user'],
  label: string,
  picture: File
) => user.upload(screen.getByLabelText(label, { selector: 'input' }), picture);

describe('EditService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(SnackbarStore, 'showSnackbar').mockImplementation(() => undefined);
  });

  it.each([
    { picture: 'logo', label: LOGO_LABEL, isLogo: true },
    { picture: 'illustration', label: ILLUSTRATION_LABEL, isLogo: false },
  ])(
    'should upload the $picture of the service when the admin validates the form',
    async ({ label, isLogo }) => {
      // Given
      vi.mocked(requestGraphqlWithUploads).mockResolvedValue(RESPONSE);
      const picture = makePicture('picture.png');
      const { user } = renderEditService();
      await uploadPicture(user, label, picture);

      // When
      await user.click(screen.getByRole('button', { name: VALIDATE_LABEL }));

      // Then
      await waitFor(() =>
        expect(requestGraphqlWithUploads).toHaveBeenCalledWith(
          AddServicePictureDocument,
          { serviceInstanceId: SERVICE_ID, document: null, isLogo },
          { document: picture }
        )
      );
    }
  );

  it('should confirm each uploaded picture when the admin sends both', async () => {
    // Given
    vi.mocked(requestGraphqlWithUploads).mockResolvedValue(RESPONSE);
    const { user } = renderEditService();
    await uploadPicture(user, LOGO_LABEL, makePicture('logo.png'));
    await uploadPicture(
      user,
      ILLUSTRATION_LABEL,
      makePicture('illustration.png')
    );

    // When
    await user.click(screen.getByRole('button', { name: VALIDATE_LABEL }));

    // Then
    await waitFor(() =>
      expect(SnackbarStore.showSnackbar).toHaveBeenCalledTimes(2)
    );
    expect(SnackbarStore.showSnackbar).toHaveBeenCalledWith({
      severity: 'success',
      title: 'Utils.Success',
      description: 'ServiceForm.PictureUpdated',
    });
  });

  it('should still confirm the upload when the API answers without the service', async () => {
    // Given
    vi.mocked(requestGraphqlWithUploads).mockResolvedValue({
      addServicePicture: null,
    });
    const { user, setOpen } = renderEditService();
    await uploadPicture(user, LOGO_LABEL, makePicture('logo.png'));

    // When
    await user.click(screen.getByRole('button', { name: VALIDATE_LABEL }));

    // Then
    await waitFor(() =>
      expect(SnackbarStore.showSnackbar).toHaveBeenCalledWith({
        severity: 'success',
        title: 'Utils.Success',
        description: 'ServiceForm.PictureUpdated',
      })
    );
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it('should close the sheet once a picture is uploaded', async () => {
    // Given
    vi.mocked(requestGraphqlWithUploads).mockResolvedValue(RESPONSE);
    const { user, setOpen } = renderEditService();
    await uploadPicture(user, LOGO_LABEL, makePicture('logo.png'));

    // When
    await user.click(screen.getByRole('button', { name: VALIDATE_LABEL }));

    // Then
    await waitFor(() => expect(setOpen).toHaveBeenCalledWith(false));
  });

  it('should show the server error when the upload is rejected', async () => {
    // Given
    vi.mocked(requestGraphqlWithUploads).mockRejectedValue(
      new Error(SERVER_ERROR)
    );
    const { user, setOpen } = renderEditService();
    await uploadPicture(user, LOGO_LABEL, makePicture('logo.png'));

    // When
    await user.click(screen.getByRole('button', { name: VALIDATE_LABEL }));

    // Then
    await waitFor(() =>
      expect(SnackbarStore.showSnackbar).toHaveBeenCalledWith({
        severity: 'error',
        title: 'Utils.Error',
        description: `Error.Server.${SERVER_ERROR}`,
      })
    );
    expect(setOpen).not.toHaveBeenCalledWith(false);
  });

  it('should not send anything when the admin validates without a picture', async () => {
    // Given
    const { user } = renderEditService();

    // When
    await user.click(screen.getByRole('button', { name: VALIDATE_LABEL }));

    // Then
    expect(requestGraphqlWithUploads).not.toHaveBeenCalled();
  });
});
