import { AdminUnregisterPlatform } from '@/components/admin/registered-platform/AdminUnregisterPlatform';
import testRender from '@/utils/test/test-render';
import { adminRegisteredPlatformsKeys } from '@graphql/admin-registered-platforms/admin-registered-platforms.keys';
import {
  type AdminUnregisterPlatformMutation,
  PlatformIdentifier,
} from '@graphql/generated';
import { mockAdminRegisteredPlatform } from '@graphql/mocks';
import { QueryClient } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const SERVICE_INSTANCE_ID = 'service-instance-id';
const TITLE = 'Production OpenCTI';
const ORGANIZATION_NAME = 'Filigran';
const ERROR_CODE = 'PLATFORM_NOT_REGISTERED';

const PLATFORM = {
  service_instance_id: SERVICE_INSTANCE_ID,
  title: TITLE,
  identifier: PlatformIdentifier.Opencti,
  organization: { id: 'organization-id', name: ORGANIZATION_NAME },
};

interface MutationOptions {
  onSuccess: (data: AdminUnregisterPlatformMutation) => Promise<void>;
  onError: (error: unknown) => void;
}

const mocks = vi.hoisted(() => ({
  useAdminUnregisterPlatformMutation: vi.fn(),
  mutate: vi.fn(),
  showSnackbar: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useAdminUnregisterPlatformMutation: mocks.useAdminUnregisterPlatformMutation,
}));

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: mocks.showSnackbar,
}));

// The options the component gave the mutation hook, to answer the request as the API would.
const mutationOptions = () =>
  mocks.useAdminUnregisterPlatformMutation.mock
    .lastCall?.[1] as MutationOptions;

const unregisteredPlatformResponse: AdminUnregisterPlatformMutation = {
  adminUnregisterPlatform: mockAdminRegisteredPlatform({
    service_instance_id: SERVICE_INSTANCE_ID,
    title: TITLE,
  }),
};

const openDialog = async (
  queryClient?: QueryClient,
  platform:
    | typeof PLATFORM
    | (Omit<typeof PLATFORM, 'organization'> & {
        organization: null;
      }) = PLATFORM
) => {
  const rendered = testRender(<AdminUnregisterPlatform platform={platform} />, {
    queryClient,
  });
  await rendered.user.click(
    screen.getByRole('button', { name: 'AdminRegisteredPlatforms.Unregister' })
  );
  return rendered;
};

const getConfirmButton = () =>
  within(screen.getByRole('alertdialog')).getByRole('button', {
    name: 'AdminRegisteredPlatforms.Unregister',
  });

describe('AdminUnregisterPlatform', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAdminUnregisterPlatformMutation.mockReturnValue({
      mutate: mocks.mutate,
      isPending: false,
    });
  });

  it('should ask for a confirmation naming the platform and its organization before unregistering it', async () => {
    // Given / When
    await openDialog();

    // Then
    expect(
      screen.getByRole('alertdialog', {
        name: 'AdminRegisteredPlatforms.UnregisterDialog.Title',
      })
    ).toHaveTextContent('AdminRegisteredPlatforms.UnregisterDialog.Text');
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it('should say nobody is notified when the platform belongs to no organization', async () => {
    // Given / When
    await openDialog(undefined, { ...PLATFORM, organization: null });

    // Then
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent(
      'AdminRegisteredPlatforms.UnregisterDialog.TextWithoutOrganization'
    );
    expect(dialog).not.toHaveTextContent(
      /UnregisterDialog\.Text(?!WithoutOrganization)/
    );
  });

  it('should unregister the platform by its service instance when the admin confirms', async () => {
    // Given
    const { user } = await openDialog();

    // When
    await user.click(getConfirmButton());

    // Then
    expect(mocks.mutate).toHaveBeenCalledWith({
      serviceInstanceId: SERVICE_INSTANCE_ID,
    });
  });

  it('should not unregister the platform when the admin cancels', async () => {
    // Given
    const { user } = await openDialog();

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Cancel' }));

    // Then
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it('should refresh the registered platforms and close the dialog when the platform is unregistered', async () => {
    // Given
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { user } = await openDialog(queryClient);
    await user.click(getConfirmButton());

    // When
    await act(() => mutationOptions().onSuccess(unregisteredPlatformResponse));

    // Then
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: adminRegisteredPlatformsKeys.all(),
    });
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    );
  });

  it('should tell the admin the platform is unregistered when the request succeeds', async () => {
    // Given
    const { user } = await openDialog();
    await user.click(getConfirmButton());

    // When
    await act(() => mutationOptions().onSuccess(unregisteredPlatformResponse));

    // Then
    expect(mocks.showSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        title: 'AdminRegisteredPlatforms.UnregisterSuccess',
      })
    );
  });

  it('should show the server error when the request fails', async () => {
    // Given
    const { user } = await openDialog();
    await user.click(getConfirmButton());

    // When
    act(() => mutationOptions().onError(new Error(ERROR_CODE)));

    // Then
    const [[snackbar]] = mocks.showSnackbar.mock.calls;
    testRender(<>{snackbar.description}</>);
    expect(snackbar.severity).toBe('error');
    expect(screen.getByText(`Error.Server.${ERROR_CODE}`)).toBeInTheDocument();
  });
});
