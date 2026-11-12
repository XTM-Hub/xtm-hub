import { vi, type Mock } from 'vitest';

interface MutationCallbacks {
  onSuccess?: (data: unknown, variables: unknown) => unknown;
  onError?: (error: unknown, variables: unknown) => unknown;
}

/**
 * Makes a generated `use<Name>Mutation` hook mock settle like react-query: the
 * hook-level callbacks run once `mutate` has been called and the request
 * resolves.
 *
 * `isPending` is what the hook reports while the request is in flight.
 *
 * Returns the `mutate` spy, called with the variables the component sends.
 */
export const mockMutationHook = (
  hookMock: Mock,
  outcome: 'success' | 'error',
  {
    error = new Error('SERVER_ERROR'),
    isPending = false,
  }: { error?: Error; isPending?: boolean } = {}
) => {
  const mutate = vi.fn();
  hookMock.mockImplementation(
    (_client: unknown, callbacks: MutationCallbacks = {}) => ({
      mutate: (variables: unknown) => {
        mutate(variables);
        void Promise.resolve().then(() =>
          outcome === 'success'
            ? callbacks.onSuccess?.({}, variables)
            : callbacks.onError?.(error, variables)
        );
      },
      isPending,
    })
  );

  return mutate;
};
