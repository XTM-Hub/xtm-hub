import { Profile } from '@/components/profile';
import { requestGraphqlWithUploads } from '@/lib/graphql-upload-client';
import { mockMutationHook } from '@/utils/test/mock-mutation-hook';
import testRender from '@/utils/test/test-render';
import { MePictureUploadDocument } from '@graphql/generated';
import { meKeys } from '@graphql/me/me.keys';
import { mockUser } from '@graphql/mocks';
import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const FIRST_NAME = 'Ada';
const LAST_NAME = 'Lovelace';
const COUNTRY = 'France';
const ME = { first_name: FIRST_NAME, last_name: LAST_NAME, country: COUNTRY };
const UPDATED_USER = mockUser({ id: 'user-1', first_name: FIRST_NAME });
const SERVER_ERROR = 'EDIT_ME_USER_ERROR';

const mocks = vi.hoisted(() => ({
  useMeProfileEditMutation: vi.fn(),
  useMePasswordResetMutation: vi.fn(),
  useApiTokensQuery: vi.fn(),
  showSnackbar: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return {
    ...(await mockGeneratedQueryHooks(importOriginal, {
      useApiTokensQuery: mocks.useApiTokensQuery,
    })),
    useMeProfileEditMutation: mocks.useMeProfileEditMutation,
    useMePasswordResetMutation: mocks.useMePasswordResetMutation,
  };
});

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: mocks.showSnackbar,
}));

vi.mock('@/lib/graphql-upload-client', () => ({
  requestGraphqlWithUploads: vi.fn(),
}));

const makePicture = () =>
  new File(['picture'], 'picture.png', { type: 'image/png' });

const getFirstNameInput = () =>
  screen.getByRole('textbox', { name: 'UserForm.FirstName' });

const submitProfile = async (queryClient?: QueryClient) => {
  const { user } = testRender(<Profile />, { me: ME, queryClient });
  await waitFor(() => expect(getFirstNameInput()).toHaveValue(FIRST_NAME));
  await user.click(
    screen.getByRole('button', { name: 'ProfilePage.UpdateProfile' })
  );
};

const uploadPicture = async (picture: File, queryClient?: QueryClient) => {
  const { user, container } = testRender(<Profile />, { queryClient });
  await user.upload(
    container.querySelector<HTMLInputElement>('input[type="file"]')!,
    picture
  );
  await user.click(
    screen.getByRole('button', { name: 'ProfilePage.UpdatePicture' })
  );
};

const resetPassword = async () => {
  const { user } = testRender(<Profile />);
  await user.click(
    screen.getByRole('button', { name: 'UserForm.ResetPassword.Action' })
  );
};

describe('Profile', () => {
  let editMeUser: ReturnType<typeof mockMutationHook>;

  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn();
    URL.revokeObjectURL = vi.fn();
    mocks.useApiTokensQuery.mockReturnValue({
      data: { apiTokens: [] },
      isLoading: false,
    });
    editMeUser = mockMutationHook(mocks.useMeProfileEditMutation, 'success', {
      data: { editMeUser: UPDATED_USER },
    });
    mockMutationHook(mocks.useMePasswordResetMutation, 'success');
    vi.mocked(requestGraphqlWithUploads).mockResolvedValue({
      uploadUserPicture: UPDATED_USER,
    });
  });

  it('should send the profile fields when the user updates the profile', async () => {
    // Given / When
    await submitProfile();

    // Then
    await waitFor(() =>
      expect(editMeUser).toHaveBeenCalledWith({
        first_name: FIRST_NAME,
        last_name: LAST_NAME,
        country: COUNTRY,
      })
    );
  });

  it('should send the chosen picture as a file upload when the user updates the picture', async () => {
    // Given
    const picture = makePicture();

    // When
    await uploadPicture(picture);

    // Then
    expect(requestGraphqlWithUploads).toHaveBeenCalledWith(
      MePictureUploadDocument,
      { document: null },
      { document: picture }
    );
  });

  it.each([
    ['profile update', submitProfile],
    [
      'picture upload',
      (queryClient: QueryClient) => uploadPicture(makePicture(), queryClient),
    ],
  ])(
    'should give the updated user to the user context when the %s succeeds',
    async (_action, update) => {
      // Given
      const queryClient = new QueryClient();

      // When
      await update(queryClient);

      // Then
      await waitFor(() =>
        expect(queryClient.getQueryData(meKeys.detail())).toEqual({
          me: UPDATED_USER,
        })
      );
    }
  );

  it.each([
    ['profile update', () => submitProfile()],
    ['picture upload', () => uploadPicture(makePicture())],
    ['password reset', resetPassword],
  ])(
    'should tell the user why when the %s fails',
    async (_action, runAction) => {
      // Given
      const error = new Error(SERVER_ERROR);
      mockMutationHook(mocks.useMeProfileEditMutation, 'error', { error });
      mockMutationHook(mocks.useMePasswordResetMutation, 'error', { error });
      vi.mocked(requestGraphqlWithUploads).mockRejectedValue(error);

      // When
      await runAction();

      // Then
      await waitFor(() =>
        expect(mocks.showSnackbar).toHaveBeenCalledWith(
          expect.objectContaining({
            severity: 'error',
            description: `Error.Server.${SERVER_ERROR}`,
          })
        )
      );
    }
  );
});
