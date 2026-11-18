import { UnregisterButton } from '@/components/service/registration/UnregisterButton';
import testRender from '@/utils/test/test-render';
import {
  OrganizationCapability,
  PlatformContract,
  PlatformIdentifier,
  RegisteredPlatformDetailsFragment,
  ServiceDefinitionIdentifier,
  UnregisterPlatformMutationVariables,
} from '@graphql/generated';
import { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  unregisterPlatform: vi.fn(),
  showSnackbar: vi.fn(),
  invalidatePrivateNavigationQueries: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  const { useMutation } = await import('@tanstack/react-query');
  return mockGeneratedQueryHooks(importOriginal, {
    // The real react-query lifecycle around a mocked request, so a test can
    // hold the request and unmount the button before it settles.
    useUnregisterPlatformMutation: (
      _client: unknown,
      options?: UseMutationOptions<
        unknown,
        Error,
        UnregisterPlatformMutationVariables
      >
    ) =>
      useMutation({
        ...options,
        mutationFn: (variables) => mocks.unregisterPlatform(variables),
      }),
  });
});

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: mocks.showSnackbar,
}));

vi.mock(
  '@/components/menu/navigation/private/private-navigation-query-invalidation',
  () => ({
    invalidatePrivateNavigationQueries:
      mocks.invalidatePrivateNavigationQueries,
  })
);

const registeredPlatform = {
  id: 'test-platform-id',
  identifier: ServiceDefinitionIdentifier.OpenaevRegistration,
  platform_id: 'id',
  tenant_id: null,
  title: 'title',
  url: 'url',
};

const ADMIN = {
  selected_org_capabilities: [OrganizationCapability.AdministrateOrganization],
};

const renderButton = (
  platform: Partial<RegisteredPlatformDetailsFragment> = {},
  me: NonNullable<Parameters<typeof testRender>[1]>['me'] = ADMIN
) =>
  testRender(
    <UnregisterButton
      platform={
        {
          contract: PlatformContract.Ce,
          ...registeredPlatform,
          ...platform,
        } as RegisteredPlatformDetailsFragment
      }
    />,
    { me }
  );

const confirmUnregistration = async (
  user: ReturnType<typeof testRender>['user']
) => {
  await user.click(screen.getByRole('button', { name: /Unregister/i }));
  await user.click(screen.getByRole('button', { name: 'Utils.Continue' }));
};

describe('Display unregister button', () => {
  it.each`
    capabilities                                                                                            | isTrial  | shouldDisplay
    ${[OrganizationCapability.AdministrateOrganization]}                                                    | ${true}  | ${false}
    ${[OrganizationCapability.ManagePlatformRegistration]}                                                  | ${true}  | ${false}
    ${[OrganizationCapability.ManagePlatformRegistration, OrganizationCapability.AdministrateOrganization]} | ${true}  | ${false}
    ${[OrganizationCapability.ManageSubscription]}                                                          | ${true}  | ${false}
    ${[]}                                                                                                   | ${true}  | ${false}
    ${[OrganizationCapability.AdministrateOrganization]}                                                    | ${false} | ${true}
    ${[OrganizationCapability.ManagePlatformRegistration]}                                                  | ${false} | ${true}
    ${[OrganizationCapability.ManagePlatformRegistration, OrganizationCapability.AdministrateOrganization]} | ${false} | ${true}
    ${[OrganizationCapability.ManageSubscription]}                                                          | ${false} | ${false}
    ${[]}                                                                                                   | ${false} | ${false}
  `(
    'Should display unregister button if user has capability $capabilities and is trial $isTrial',
    async ({ capabilities, isTrial, shouldDisplay }) => {
      // Given
      const { queryByRole } = renderButton(
        { contract: isTrial ? PlatformContract.Trial : PlatformContract.Ce },
        { selected_org_capabilities: capabilities }
      );
      // Then
      const unregisterButton = queryByRole('button', {
        name: /Unregister/i,
      });
      if (shouldDisplay) {
        expect(unregisterButton).toBeInTheDocument();
      } else {
        expect(unregisterButton).not.toBeInTheDocument();
      }
    }
  );
});

describe('Unregister the platform', () => {
  const push = vi.fn();

  beforeEach(() => {
    mocks.unregisterPlatform.mockReset();
    mocks.showSnackbar.mockReset();
    mocks.invalidatePrivateNavigationQueries.mockReset();
    push.mockReset();
    vi.mocked(useRouter).mockReturnValue({
      push,
    } as unknown as ReturnType<typeof useRouter>);
  });

  it('should unregister the platform of its product then go back home', async () => {
    // Given
    mocks.unregisterPlatform.mockResolvedValue({});
    const { user } = renderButton();

    // When
    await confirmUnregistration(user);

    // Then
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app'));
    expect(mocks.unregisterPlatform).toHaveBeenCalledWith({
      input: {
        platformId: registeredPlatform.platform_id,
        identifier: PlatformIdentifier.Openaev,
        tenantId: null,
      },
    });
    expect(mocks.invalidatePrivateNavigationQueries).toHaveBeenCalledWith(
      expect.any(QueryClient)
    );
    expect(mocks.showSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success' })
    );
  });

  it('should refresh the navigation even when the button unmounts before the unregistration settles', async () => {
    // Given
    const request = Promise.withResolvers<unknown>();
    mocks.unregisterPlatform.mockReturnValue(request.promise);
    const { user, unmount } = renderButton();
    await confirmUnregistration(user);
    expect(mocks.invalidatePrivateNavigationQueries).not.toHaveBeenCalled();

    // When
    unmount();
    request.resolve({});

    // Then
    await waitFor(() =>
      expect(mocks.invalidatePrivateNavigationQueries).toHaveBeenCalledWith(
        expect.any(QueryClient)
      )
    );
    expect(push).not.toHaveBeenCalled();
    expect(mocks.showSnackbar).not.toHaveBeenCalled();
  });

  it('should stay on the page and show the server error when the unregistration fails', async () => {
    // Given
    mocks.unregisterPlatform.mockRejectedValue(new Error('PLATFORM_NOT_FOUND'));
    const { user } = renderButton();

    // When
    await confirmUnregistration(user);

    // Then
    await waitFor(() =>
      expect(mocks.showSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          description: 'Error.Server.PLATFORM_NOT_FOUND',
        })
      )
    );
    expect(push).not.toHaveBeenCalled();
    expect(mocks.invalidatePrivateNavigationQueries).not.toHaveBeenCalled();
  });

  it('should not call the server when the platform has no known product', async () => {
    // Given
    const { user } = renderButton({
      identifier: 'unknown' as ServiceDefinitionIdentifier,
    });

    // When
    await confirmUnregistration(user);

    // Then
    expect(mocks.unregisterPlatform).not.toHaveBeenCalled();
    expect(mocks.showSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error' })
    );
  });
});
