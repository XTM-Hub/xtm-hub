import { vi, type Mock } from 'vitest';

interface MutationCallbacks {
  onSuccess?: (data: unknown, variables: unknown) => unknown;
  onError?: (error: unknown, variables: unknown) => unknown;
  onSettled?: (data: unknown, error: unknown, variables: unknown) => unknown;
}

/**
 * Makes a generated `use<Name>Mutation` hook mock settle like react-query: the
 * hook-level callbacks run once `mutate` has been called and the request
 * resolves, `onSettled` after `onSuccess` or `onError`.
 *
 * `isPending` is what the hook reports while the request is in flight, `data`
 * what a successful request answers.
 *
 * Returns the `mutate` spy, called with the variables the component sends.
 */
export const mockMutationHook = (
  hookMock: Mock,
  outcome: 'success' | 'error',
  {
    error = new Error('SERVER_ERROR'),
    isPending = false,
    data = {},
  }: { error?: Error; isPending?: boolean; data?: unknown } = {}
) => {
  const mutate = vi.fn();
  hookMock.mockImplementation(
    (_client: unknown, callbacks: MutationCallbacks = {}) => ({
      mutate: (variables: unknown) => {
        mutate(variables);
        void Promise.resolve().then(() => {
          if (outcome === 'success') {
            callbacks.onSuccess?.(data, variables);
            callbacks.onSettled?.(data, null, variables);
          } else {
            callbacks.onError?.(error, variables);
            callbacks.onSettled?.(undefined, error, variables);
          }
        });
      },
      isPending,
    })
  );

  return mutate;
};
