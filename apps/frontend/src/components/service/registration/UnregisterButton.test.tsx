import { UnregisterButton } from '@/components/service/registration/UnregisterButton';
import testRender from '@/utils/test/test-render';
import {
  OrganizationCapability,
  PlatformContract,
  PlatformIdentifier,
  RegisteredPlatformDetailsFragment,
  ServiceDefinitionIdentifier,
} from '@graphql/generated';
import { QueryClient } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
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
  return mockGeneratedQueryHooks(importOriginal, {
    useUnregisterPlatformMutation: () => ({ mutate: mocks.unregisterPlatform }),
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
    mocks.unregisterPlatform.mockImplementation((_variables, options) =>
      options.onSuccess()
    );
    const { user } = renderButton();

    // When
    await confirmUnregistration(user);

    // Then
    expect(mocks.unregisterPlatform).toHaveBeenCalledWith(
      {
        input: {
          platformId: registeredPlatform.platform_id,
          identifier: PlatformIdentifier.Openaev,
          tenantId: null,
        },
      },
      expect.anything()
    );
    expect(mocks.invalidatePrivateNavigationQueries).toHaveBeenCalledWith(
      expect.any(QueryClient)
    );
    expect(push).toHaveBeenCalledWith('/app');
    expect(mocks.showSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success' })
    );
  });

  it('should stay on the page and show the server error when the unregistration fails', async () => {
    // Given
    mocks.unregisterPlatform.mockImplementation((_variables, options) =>
      options.onError(new Error('PLATFORM_NOT_FOUND'))
    );
    const { user } = renderButton();

    // When
    await confirmUnregistration(user);

    // Then
    expect(push).not.toHaveBeenCalled();
    expect(mocks.showSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        description: 'Error.Server.PLATFORM_NOT_FOUND',
      })
    );
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
