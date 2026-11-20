import { SubscriptionSlugAddCapabilities } from '@/components/subcription/[slug]/SubscriptionSlugAddCapabilities';
import * as SnackbarStore from '@/components/ui/snackbar/snackbar-store';
import { mockMutationHook } from '@/utils/test/mock-mutation-hook';
import testRender from '@/utils/test/test-render';
import { type UserServiceItemFragment } from '@graphql/generated';
import { userServicesKeys } from '@graphql/user-service/user-service.keys';
import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useAddCapabilitiesToUserServicesMutation: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useAddCapabilitiesToUserServicesMutation:
    mocks.useAddCapabilitiesToUserServicesMutation,
}));

const SERVICE_INSTANCE_ID = 'service-instance-1';
const USER_SERVICE_ID = 'user-service-1';
const CAPABILITY = { id: 'capability-1', name: 'Upload' };
const VALIDATE_LABEL = 'Utils.Validate';
const SERVER_ERROR = 'CAPABILITY_NOT_FOUND';

const USER_SERVICE: UserServiceItemFragment = {
  id: USER_SERVICE_ID,
  user: null,
  subscription: null,
  user_service_capability: [],
};

const renderAddCapabilities = () => {
  const queryClient = new QueryClient();
  const invalidateQueries = vi
    .spyOn(queryClient, 'invalidateQueries')
    .mockResolvedValue();
  const setOpen = vi.fn();
  const onCompleted = vi.fn();
  const rendered = testRender(
    <SubscriptionSlugAddCapabilities
      selectedUserServices={[USER_SERVICE]}
      availableCapabilities={[CAPABILITY]}
      open
      setOpen={setOpen}
      serviceInstanceId={SERVICE_INSTANCE_ID}
      onCompleted={onCompleted}
    />,
    { queryClient }
  );
  return { ...rendered, invalidateQueries, setOpen, onCompleted };
};

const addCapability = async (user: ReturnType<typeof testRender>['user']) => {
  await user.click(screen.getByRole('checkbox', { name: CAPABILITY.name }));
  await user.click(screen.getByRole('button', { name: VALIDATE_LABEL }));
};

describe('SubscriptionSlugAddCapabilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(SnackbarStore, 'showSnackbar').mockImplementation(() => undefined);
  });

  it('should add the checked capabilities to the selected users', async () => {
    // Given
    const addCapabilities = mockMutationHook(
      mocks.useAddCapabilitiesToUserServicesMutation,
      'success'
    );
    const { user } = renderAddCapabilities();

    // When
    await addCapability(user);

    // Then
    expect(addCapabilities).toHaveBeenCalledWith({
      input: {
        userServiceIds: [USER_SERVICE_ID],
        capabilities: [CAPABILITY.id],
      },
      service_instance_id: SERVICE_INSTANCE_ID,
    });
  });

  it('should refresh the users and close the dialog once the capabilities are added', async () => {
    // Given
    mockMutationHook(mocks.useAddCapabilitiesToUserServicesMutation, 'success');
    const { user, invalidateQueries, setOpen, onCompleted } =
      renderAddCapabilities();

    // When
    await addCapability(user);

    // Then
    await waitFor(() => expect(onCompleted).toHaveBeenCalled());
    expect(setOpen).toHaveBeenCalledWith(false);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: userServicesKeys.all(),
    });
  });

  it('should show the server error when the capabilities are rejected', async () => {
    // Given
    mockMutationHook(mocks.useAddCapabilitiesToUserServicesMutation, 'error', {
      error: new Error(SERVER_ERROR),
    });
    const { user, onCompleted } = renderAddCapabilities();

    // When
    await addCapability(user);

    // Then
    await waitFor(() =>
      expect(SnackbarStore.showSnackbar).toHaveBeenCalledWith({
        severity: 'error',
        title: 'Utils.Error',
        description: <>{`Error.Server.${SERVER_ERROR}`}</>,
      })
    );
    expect(onCompleted).not.toHaveBeenCalled();
  });
});
