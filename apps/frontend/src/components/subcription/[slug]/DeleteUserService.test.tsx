import { DeleteUserService } from '@/components/subcription/[slug]/DeleteUserService';
import * as SnackbarStore from '@/components/ui/snackbar/snackbar-store';
import { mockMutationHook } from '@/utils/test/mock-mutation-hook';
import testRender from '@/utils/test/test-render';
import {
  ServiceDefinitionIdentifier,
  type UserServiceItemFragment,
} from '@graphql/generated';
import { userServicesKeys } from '@graphql/user-service/user-service.keys';
import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useDeleteUserServicesMutation: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useDeleteUserServicesMutation: mocks.useDeleteUserServicesMutation,
}));

const SERVICE_INSTANCE_ID = 'service-instance-1';
const USER_SERVICE_ID = 'user-service-1';
const REMOVE_ACCESS_LABEL = 'Service.Management.RemoveAccess';
const SERVER_ERROR = 'USER_SERVICE_NOT_FOUND';

const USER_SERVICE: UserServiceItemFragment = {
  id: USER_SERVICE_ID,
  user: {
    id: 'user-1',
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane.doe@filigran.io',
  },
  subscription: {
    service_instance: {
      id: SERVICE_INSTANCE_ID,
      name: 'Service',
      service_definition: {
        identifier: ServiceDefinitionIdentifier.OpenctiCustomDashboards,
      },
    },
  },
  user_service_capability: [],
};

const renderDeleteUserService = () => {
  const queryClient = new QueryClient();
  const invalidateQueries = vi
    .spyOn(queryClient, 'invalidateQueries')
    .mockResolvedValue();
  const onOpenChange = vi.fn();
  const onDeleted = vi.fn();
  const rendered = testRender(
    <DeleteUserService
      userServices={[USER_SERVICE]}
      isOpen
      onOpenChange={onOpenChange}
      onDeleted={onDeleted}
    />,
    { queryClient }
  );
  return { ...rendered, invalidateQueries, onOpenChange, onDeleted };
};

const confirm = (user: ReturnType<typeof testRender>['user']) =>
  user.click(screen.getByRole('button', { name: REMOVE_ACCESS_LABEL }));

describe('DeleteUserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(SnackbarStore, 'showSnackbar').mockImplementation(() => undefined);
  });

  it('should remove the access of the selected users to their service', async () => {
    // Given
    const deleteUserServices = mockMutationHook(
      mocks.useDeleteUserServicesMutation,
      'success'
    );
    const { user } = renderDeleteUserService();

    // When
    await confirm(user);

    // Then
    expect(deleteUserServices).toHaveBeenCalledWith({
      input: { userServiceIds: [USER_SERVICE_ID] },
      service_instance_id: SERVICE_INSTANCE_ID,
    });
  });

  it('should refresh the users, close the dialog and notify the parent once the access is removed', async () => {
    // Given
    mockMutationHook(mocks.useDeleteUserServicesMutation, 'success');
    const { user, invalidateQueries, onOpenChange, onDeleted } =
      renderDeleteUserService();

    // When
    await confirm(user);

    // Then
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: userServicesKeys.all(),
    });
  });

  it('should show the server error and keep the dialog when the removal is rejected', async () => {
    // Given
    mockMutationHook(mocks.useDeleteUserServicesMutation, 'error', {
      error: new Error(SERVER_ERROR),
    });
    const { user, onDeleted } = renderDeleteUserService();

    // When
    await confirm(user);

    // Then
    await waitFor(() =>
      expect(SnackbarStore.showSnackbar).toHaveBeenCalledWith({
        severity: 'error',
        title: 'Utils.Error',
        description: `Error.Server.${SERVER_ERROR}`,
      })
    );
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
