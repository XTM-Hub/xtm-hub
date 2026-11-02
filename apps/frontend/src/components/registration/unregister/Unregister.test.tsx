import { RegistrationContext } from '@/components/registration/Context';
import { PlatformMetadataMapping } from '@/components/registration/PlatformIdentifierMapping';
import { Unregister } from '@/components/registration/unregister/Index';
import * as SnackbarStore from '@/components/ui/snackbar/snackbar-store';
import testRender from '@/utils/test/test-render';
import { registerCanUnregisterPlatformQuery } from '@generated/registerCanUnregisterPlatformQuery.graphql';
import { PlatformIdentifier } from '@graphql/generated';
import { screen, waitFor } from '@testing-library/react';
import { PreloadedQuery } from 'react-relay';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  mutationMode: 'success' as 'success' | 'error',
}));

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-relay')>()),
  usePreloadedQuery: () => ({ canUnregisterPlatform: {} }),
  useFragment: () => ({
    isAllowed: true,
    isPlatformRegistered: true,
    isInOrganization: true,
    organizationId: 'org-1',
    organizationName: 'Org One',
  }),
  useMutation: () => [
    (opts: {
      onCompleted?: (data: unknown) => void;
      onError?: (error: Error) => void;
    }) => {
      if (testState.mutationMode === 'error') {
        opts.onError?.(new Error('SOME_ERROR'));
        return;
      }
      opts.onCompleted?.({});
    },
    {},
  ],
}));

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

const mockQueryRef = {} as PreloadedQuery<registerCanUnregisterPlatformQuery>;

const renderUnregister = (identifier: PlatformIdentifier, state?: string) =>
  testRender(
    <RegistrationContext.Provider
      value={{
        identifier,
        displayedIdentifier: PlatformMetadataMapping[identifier].name,
      }}>
      <Unregister
        queryRef={mockQueryRef}
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
    vi.spyOn(SnackbarStore, 'showSnackbar').mockImplementation(() => undefined);
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
