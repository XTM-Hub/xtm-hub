import { RegistrationContext } from '@/components/registration/Context';
import { PlatformMetadataMapping } from '@/components/registration/PlatformIdentifierMapping';
import { Register } from '@/components/registration/register';
import * as SnackbarStore from '@/components/ui/snackbar/snackbar-store';
import testRender from '@/utils/test/test-render';
import { organizationListUserOrganizationsQuery$data } from '@generated/organizationListUserOrganizationsQuery.graphql';
import { registerIsPlatformRegisteredFragment$data } from '@generated/registerIsPlatformRegisteredFragment.graphql';
import { registerIsPlatformRegisteredQuery } from '@generated/registerIsPlatformRegisteredQuery.graphql';
import { PlatformInput } from '@generated/registerPlatformMutation.graphql';
import {
  PlatformIdentifier,
  PlatformRegistrationStatus,
} from '@graphql/generated';
import { screen, waitFor } from '@testing-library/react';
import { PreloadedQuery } from 'react-relay';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  isPlatformRegistered: {
    status: 'never_registered',
    platformTitle: null,
    organization: null,
  } as registerIsPlatformRegisteredFragment$data,
  userOrganizations: [
    { id: 'org-1', name: 'Org One', personal_space: false },
    { id: 'org-2', name: 'Org Two', personal_space: true },
  ] as organizationListUserOrganizationsQuery$data['userOrganizations'],
  mutationMode: 'success' as 'success' | 'missing-capability' | 'error',
  token: 'a-token',
  errorMessage: 'SOME_ERROR',
  lastRegisterVariables: null as Record<string, unknown> | null,
}));

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-relay')>()),
  usePreloadedQuery: () => ({
    isPlatformRegistered: testState.isPlatformRegistered,
  }),
  useLazyLoadQuery: () => ({
    userOrganizations: testState.userOrganizations,
  }),
  useFragment: (_doc: unknown, ref: unknown) => ref,
  useMutation: () => [
    (opts: {
      variables: Record<string, unknown>;
      onCompleted?: (data: unknown) => void;
      onError?: (error: Error) => void;
    }) => {
      testState.lastRegisterVariables = opts.variables;
      if (testState.mutationMode === 'missing-capability') {
        opts.onError?.(new Error('MISSING_CAPABILITY_ON_ORGANIZATION'));
        return;
      }
      if (testState.mutationMode === 'error') {
        opts.onError?.(new Error(testState.errorMessage));
        return;
      }
      opts.onCompleted?.({ registerPlatform: { token: testState.token } });
    },
    {},
  ],
}));

vi.mock('@/components/Loader', () => ({
  default: () => <div data-testid="loader" />,
}));

vi.mock('@/components/registration/register/MissingCapability', () => ({
  RegisterStateMissingCapability: ({
    organizationId,
    cancel,
  }: {
    organizationId: string;
    cancel: () => void;
  }) => (
    <div data-testid="missing-capability">
      <span>{organizationId}</span>
      <button onClick={cancel}>mock-cancel</button>
    </div>
  ),
}));

vi.mock('@/components/registration/register/OrganizationForm', () => ({
  RegisterOrganizationForm: ({
    userOrganizationsQueryData,
    cancel,
    confirm,
  }: {
    userOrganizationsQueryData: organizationListUserOrganizationsQuery$data;
    cancel: () => void;
    confirm: (organizationId: string) => void;
  }) => (
    <div data-testid="organization-form">
      <span>{userOrganizationsQueryData.userOrganizations.length}</span>
      <button onClick={cancel}>mock-cancel</button>
      <button onClick={() => confirm('org-1')}>mock-confirm</button>
    </div>
  ),
}));

const mockQueryRef = {} as PreloadedQuery<registerIsPlatformRegisteredQuery>;
const mockPlatform: PlatformInput = {
  url: 'https://opencti.example.com',
};

const renderRegister = () =>
  testRender(
    <RegistrationContext.Provider
      value={{
        identifier: PlatformIdentifier.Opencti,
        displayedIdentifier:
          PlatformMetadataMapping[PlatformIdentifier.Opencti].name,
      }}>
      <Register
        queryRef={mockQueryRef}
        platform={mockPlatform}
      />
    </RegistrationContext.Provider>
  );

describe('Register', () => {
  beforeEach(() => {
    testState.isPlatformRegistered = {
      status: 'never_registered',
      platformTitle: null,
      organization: null,
    } as registerIsPlatformRegisteredFragment$data;
    testState.userOrganizations = [
      { id: 'org-1', name: 'Org One', personal_space: false },
      { id: 'org-2', name: 'Org Two', personal_space: true },
    ];
    testState.mutationMode = 'success';
    testState.token = 'a-token';
    testState.errorMessage = 'SOME_ERROR';
    testState.lastRegisterVariables = null;
    vi.spyOn(SnackbarStore, 'showSnackbar').mockImplementation(() => undefined);
  });

  it('renders the organization form when the platform was never registered', () => {
    testState.isPlatformRegistered = {
      status: PlatformRegistrationStatus.NeverRegistered,
      platformTitle: null,
      organization: null,
    } as registerIsPlatformRegisteredFragment$data;
    renderRegister();
    expect(screen.getByTestId('organization-form')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders the organization form when the platform is unregistered with two or fewer organizations', () => {
    testState.isPlatformRegistered = {
      status: PlatformRegistrationStatus.Unregistered,
      platformTitle: null,
      organization: null,
    } as registerIsPlatformRegisteredFragment$data;
    renderRegister();
    expect(screen.getByTestId('organization-form')).toBeInTheDocument();
  });

  it('calls window.opener postMessage with cancel action when cancel is triggered', async () => {
    testState.isPlatformRegistered = {
      status: PlatformRegistrationStatus.NeverRegistered,
      platformTitle: null,
      organization: null,
    } as registerIsPlatformRegisteredFragment$data;
    const postMessage = vi.fn();
    Object.defineProperty(window, 'opener', {
      value: { postMessage },
      writable: true,
    });
    const { user } = renderRegister();
    await user.click(screen.getByRole('button', { name: 'mock-cancel' }));
    expect(postMessage).toHaveBeenCalledWith({ action: 'cancel' }, '*');
  });

  it('renders the "too much organization" screen when unregistered with more than two organizations', async () => {
    testState.isPlatformRegistered = {
      status: PlatformRegistrationStatus.Unregistered,
      platformTitle: 'My Platform',
      organization: { id: 'org-3' },
    } as registerIsPlatformRegisteredFragment$data;
    testState.userOrganizations = [
      { id: 'org-1', name: 'Org One', personal_space: false },
      { id: 'org-2', name: 'Org Two', personal_space: false },
      { id: 'org-3', name: 'Org Three', personal_space: true },
    ];
    const { user } = renderRegister();
    expect(
      screen.getByText('Register.TooManyOrganizations.Title')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Register.TooManyOrganizations.Description1/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Register.TooManyOrganizations.Description2/)
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Utils.Confirm' }));
    await waitFor(() => {
      expect(testState.lastRegisterVariables).toEqual({
        input: {
          organizationId: 'org-3',
          platform: mockPlatform,
          identifier: PlatformIdentifier.Opencti,
        },
      });
    });
  });

  it('posts a register message to window.opener once the mutation resolves with a token', async () => {
    testState.isPlatformRegistered = {
      status: PlatformRegistrationStatus.NeverRegistered,
      platformTitle: null,
      organization: null,
    } as registerIsPlatformRegisteredFragment$data;
    testState.mutationMode = 'success';
    testState.token = 'my-token';
    const postMessage = vi.fn();
    Object.defineProperty(window, 'opener', {
      value: { postMessage },
      writable: true,
    });
    const { user } = renderRegister();

    await user.click(screen.getByRole('button', { name: 'mock-confirm' }));

    await waitFor(() => {
      expect(postMessage).toHaveBeenCalledWith(
        { action: 'register', token: 'my-token' },
        '*'
      );
    });
  });

  it('automatically registers when the platform is already registered with an organization', async () => {
    testState.isPlatformRegistered = {
      status: PlatformRegistrationStatus.Registered,
      platformTitle: 'My Platform',
      organization: { id: 'org-auto' },
    } as registerIsPlatformRegisteredFragment$data;
    const postMessage = vi.fn();
    Object.defineProperty(window, 'opener', {
      value: { postMessage },
      writable: true,
    });
    renderRegister();

    await waitFor(() => {
      expect(testState.lastRegisterVariables).toEqual({
        input: {
          organizationId: 'org-auto',
          platform: mockPlatform,
          identifier: PlatformIdentifier.Opencti,
        },
      });
    });
    await waitFor(() => {
      expect(postMessage).toHaveBeenCalledWith(
        { action: 'register', token: testState.token },
        '*'
      );
    });
    expect(
      screen.getByRole('heading', { name: 'Register.Succeeded.Title' })
    ).toBeInTheDocument();
  });

  it('calls the error toast when the mutation errors out', async () => {
    testState.isPlatformRegistered = {
      status: PlatformRegistrationStatus.NeverRegistered,
      platformTitle: null,
      organization: null,
    } as registerIsPlatformRegisteredFragment$data;
    testState.mutationMode = 'error';
    testState.errorMessage = 'SOME_ERROR';
    const { user } = renderRegister();

    await user.click(screen.getByRole('button', { name: 'mock-confirm' }));

    await waitFor(() => {
      expect(SnackbarStore.showSnackbar).toHaveBeenCalledWith({
        severity: 'error',
        title: 'Utils.Error',
        description: 'Error.Server.SOME_ERROR',
      });
    });
    expect(
      screen.getByRole('heading', { name: 'Register.Failed.Title' })
    ).toBeInTheDocument();
  });

  it('shows the missing-capability state when the mutation errors with MISSING_CAPABILITY_ON_ORGANIZATION', async () => {
    testState.isPlatformRegistered = {
      status: PlatformRegistrationStatus.NeverRegistered,
      platformTitle: null,
      organization: null,
    } as registerIsPlatformRegisteredFragment$data;
    testState.mutationMode = 'missing-capability';
    const { user } = renderRegister();

    await user.click(screen.getByRole('button', { name: 'mock-confirm' }));

    await waitFor(() => {
      expect(testState.lastRegisterVariables).toEqual({
        input: {
          organizationId: 'org-1',
          platform: mockPlatform,
          identifier: PlatformIdentifier.Opencti,
        },
      });
    });
    expect(screen.getByTestId('missing-capability')).toBeInTheDocument();
  });

  it('calls window.opener postMessage with cancel action after a missing capability error', async () => {
    testState.isPlatformRegistered = {
      status: PlatformRegistrationStatus.NeverRegistered,
      platformTitle: null,
      organization: null,
    } as registerIsPlatformRegisteredFragment$data;
    testState.mutationMode = 'missing-capability';
    const postMessage = vi.fn();
    Object.defineProperty(window, 'opener', {
      value: { postMessage },
      writable: true,
    });
    const { user } = renderRegister();

    await user.click(screen.getByRole('button', { name: 'mock-confirm' }));
    await waitFor(() => {
      expect(testState.lastRegisterVariables).not.toBeNull();
    });
    expect(screen.getByTestId('missing-capability')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'mock-cancel' }));
    expect(postMessage).toHaveBeenCalledWith({ action: 'cancel' }, '*');
  });

  it('renders a loader as a fallback for any other status', () => {
    testState.isPlatformRegistered = {
      status: PlatformRegistrationStatus.Registered,
      platformTitle: null,
      organization: null,
    } as registerIsPlatformRegisteredFragment$data;
    renderRegister();
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });
});
