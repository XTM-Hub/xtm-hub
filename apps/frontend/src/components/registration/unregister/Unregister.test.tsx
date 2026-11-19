import { RegistrationContext } from '@/components/registration/Context';
import { PlatformMetadataMapping } from '@/components/registration/PlatformIdentifierMapping';
import { Unregister } from '@/components/registration/unregister/Index';
import * as SnackbarStore from '@/components/ui/snackbar/snackbar-store';
import testRender from '@/utils/test/test-render';
import {
  CanUnregisterPlatformQuery,
  PlatformIdentifier,
} from '@graphql/generated';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  mutationMode: 'success' as 'success' | 'error',
  unregisterPlatform: vi.fn(),
  // When set, the hook returns a real react-query mutation whose request is this function,
  // so the pending, success and error states re-render the page as they do in the app.
  unregisterRequest: null as ((variables: unknown) => Promise<unknown>) | null,
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  const { useMutation } = await import('@tanstack/react-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useUnregisterPlatformMutation: () => {
      const mutation = useMutation({
        mutationFn: (variables: unknown) =>
          testState.unregisterRequest?.(variables) ?? Promise.resolve({}),
      });
      return testState.unregisterRequest
        ? mutation
        : { mutate: testState.unregisterPlatform };
    },
  });
});

const CAN_UNREGISTER_PLATFORM: CanUnregisterPlatformQuery['canUnregisterPlatform'] =
  {
    isAllowed: true,
    isPlatformRegistered: true,
    isInOrganization: true,
    organizationId: 'org-1',
    organizationName: 'Org One',
  };

vi.mock('@/components/Loader', () => ({
  default: () => <div data-testid="loader" />,
}));

vi.mock('@/components/registration/unregister/Confirm', () => ({
  UnregisterConfirm: ({
    cancel,
    confirm,
  }: {
    cancel: () => void;
    confirm: () => void;
  }) => (
    <div data-testid="unregister-confirm">
      <button onClick={cancel}>mock-cancel</button>
      <button onClick={confirm}>mock-confirm</button>
    </div>
  ),
}));

const renderUnregister = (
  identifier: PlatformIdentifier,
  state?: string,
  canUnregisterPlatform = CAN_UNREGISTER_PLATFORM
) =>
  testRender(
    <RegistrationContext.Provider
      value={{
        identifier,
        displayedIdentifier: PlatformMetadataMapping[identifier].name,
      }}>
      <Unregister
        canUnregisterPlatform={canUnregisterPlatform}
        platformId="platform-id"
        state={state}
      />
    </RegistrationContext.Provider>
  );

const mockOpener = () => {
  const postMessage = vi.fn();
  Object.defineProperty(window, 'opener', {
    value: { postMessage },
    writable: true,
  });
  return postMessage;
};

describe('Unregister', () => {
  beforeEach(() => {
    testState.mutationMode = 'success';
    testState.unregisterRequest = null;
    testState.unregisterPlatform.mockReset();
    testState.unregisterPlatform.mockImplementation(
      (
        _variables,
        options: { onSuccess: () => void; onError: (error: Error) => void }
      ) => {
        if (testState.mutationMode === 'error') {
          options.onError(new Error('SOME_ERROR'));
          return;
        }
        options.onSuccess();
      }
    );
    vi.spyOn(SnackbarStore, 'showSnackbar').mockImplementation(() => undefined);
  });

  it('unregisters the platform of the opener from its product', async () => {
    // Given
    mockOpener();
    const { user } = renderUnregister(PlatformIdentifier.Opencti);

    // When
    await user.click(screen.getByRole('button', { name: 'mock-confirm' }));

    // Then
    expect(testState.unregisterPlatform).toHaveBeenCalledWith(
      {
        input: {
          platformId: 'platform-id',
          identifier: PlatformIdentifier.Opencti,
          tenantId: null,
        },
      },
      expect.anything()
    );
    expect(
      await screen.findByText('Unregister.Succeeded.Description')
    ).toBeInTheDocument();
  });

  it('acknowledges a platform that is no longer registered with a single request', async () => {
    // Given a platform the hub no longer knows, and a request that stays pending until the test ends it
    const postMessage = mockOpener();
    let endRequest: () => void = () => undefined;
    const unregisterRequest = vi.fn(
      () =>
        new Promise<unknown>((resolve) => {
          endRequest = () => resolve({ unregisterPlatform: true });
        })
    );
    testState.unregisterRequest = unregisterRequest;

    // When the page opens and the request is still pending
    renderUnregister(PlatformIdentifier.Xtmone, 's-1', {
      ...CAN_UNREGISTER_PLATFORM,
      isPlatformRegistered: false,
    });
    await waitFor(() => {
      expect(unregisterRequest).toHaveBeenCalled();
    });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Then the pending state does not start another request
    expect(unregisterRequest).toHaveBeenCalledOnce();

    // When the request succeeds
    endRequest();

    // Then the opener learns the platform is unregistered
    expect(
      await screen.findByText('Unregister.Succeeded.Description')
    ).toBeInTheDocument();
    expect(postMessage).toHaveBeenCalledExactlyOnceWith(
      { action: 'unregister', state: 's-1' },
      '*'
    );
  });

  describe('state echo', () => {
    it('echoes the state in the unregister message for XTM One', async () => {
      // Given an XTM One platform that opened the page with a state
      const postMessage = mockOpener();
      const { user } = renderUnregister(PlatformIdentifier.Xtmone, 's-1');

      // When
      await user.click(screen.getByRole('button', { name: 'mock-confirm' }));

      // Then
      await waitFor(() => {
        expect(postMessage).toHaveBeenCalledWith(
          { action: 'unregister', state: 's-1' },
          '*'
        );
      });
    });

    it('echoes the state in the cancel message for XTM One', async () => {
      // Given
      const postMessage = mockOpener();
      const { user } = renderUnregister(PlatformIdentifier.Xtmone, 's-1');

      // When
      await user.click(screen.getByRole('button', { name: 'mock-cancel' }));

      // Then
      expect(postMessage).toHaveBeenCalledWith(
        { action: 'cancel', state: 's-1' },
        '*'
      );
    });

    it('sends no state key for XTM One when the page was opened without one', async () => {
      // Given
      const postMessage = mockOpener();
      const { user } = renderUnregister(PlatformIdentifier.Xtmone);

      // When
      await user.click(screen.getByRole('button', { name: 'mock-confirm' }));

      // Then
      await waitFor(() => {
        expect(postMessage).toHaveBeenCalledWith({ action: 'unregister' }, '*');
      });
    });

    it.each([PlatformIdentifier.Opencti, PlatformIdentifier.Openaev])(
      'does not echo the state for %s',
      async (identifier) => {
        // Given a platform page opened with a state
        const postMessage = mockOpener();
        const { user } = renderUnregister(identifier, 's-1');

        // When
        await user.click(screen.getByRole('button', { name: 'mock-confirm' }));

        // Then
        await waitFor(() => {
          expect(postMessage).toHaveBeenCalledWith(
            { action: 'unregister' },
            '*'
          );
        });
      }
    );

    it('posts no message when the unregistration fails', async () => {
      // Given
      testState.mutationMode = 'error';
      const postMessage = mockOpener();
      const { user } = renderUnregister(PlatformIdentifier.Xtmone, 's-1');

      // When
      await user.click(screen.getByRole('button', { name: 'mock-confirm' }));

      // Then
      await waitFor(() => {
        expect(screen.getByText('Unregister.Failed.Title')).toBeInTheDocument();
      });
      expect(postMessage).not.toHaveBeenCalled();
    });
  });
});
