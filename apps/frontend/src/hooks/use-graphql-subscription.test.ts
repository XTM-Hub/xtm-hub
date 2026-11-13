import { useGraphqlSubscription } from '@/hooks/use-graphql-subscription';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { getSseClient } from '@/lib/sse-client';
import { redirectToLogin } from '@/utils/redirect';
import {
  FrontendErrorLogMutation,
  useFrontendErrorLogMutation,
} from '@graphql/generated';
import { renderHook } from '@testing-library/react';
import {
  Client,
  ExecutionResult,
  NetworkError,
  RequestParams,
  Sink,
} from 'graphql-sse';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';

vi.mock('@/lib/sse-client', () => ({ getSseClient: vi.fn() }));

vi.mock('@/utils/redirect', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/redirect')>()),
  redirectToLogin: vi.fn(),
}));

type TestData = {
  User: { delete: { id: string } | null } | null;
};
type TestVariables = { organizationId: string; first: number };
type TestHookProps = {
  document?: string;
  variables: TestVariables;
  onNext: (data: TestData) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
};

const OPERATION_NAME = 'TestUserEvents';
const DOCUMENT = `subscription ${OPERATION_NAME}($organizationId: ID!, $first: Int!) {
  User(organizationId: $organizationId) { delete { id } }
}`;
const OTHER_DOCUMENT = `subscription TestUserPendingEvents($organizationId: ID!, $first: Int!) {
  UserPending(organizationId: $organizationId) { delete { id } }
}`;
const ANONYMOUS_DOCUMENT = `subscription ($organizationId: ID!, $first: Int!) {
  User(organizationId: $organizationId) { delete { id } }
}`;
const ANONYMOUS_OPERATION_LABEL = 'Anonymous';
const ORGANIZATION_ID = 'organization-1';
const OTHER_ORGANIZATION_ID = 'organization-2';
const FIRST = 10;
const VARIABLES: TestVariables = {
  organizationId: ORGANIZATION_ID,
  first: FIRST,
};
const DELETED_USER_ID = 'user-1';
const DATA: TestData = { User: { delete: { id: DELETED_USER_ID } } };
const FORBIDDEN_MESSAGE = 'Forbidden';
const TRANSPORT_ERROR_MESSAGE = 'Server responded with 502: Bad Gateway';
const ON_NEXT_EXCEPTION_MESSAGE = 'onNext failed';
const ON_ERROR_EXCEPTION_MESSAGE = 'onError failed';
const REPORT_FAILURE_MESSAGE = 'frontendErrorLog failed';

let sendReport: Mock<() => Promise<FrontendErrorLogMutation>>;

const reportedMessage = (operationLabel: string, message: string) =>
  `[GraphQL subscription] ${operationLabel}: ${message}`;

// A rejection nobody handles is reported once the microtasks have run.
const flushUnhandledRejections = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

type FakeSubscription = {
  request: RequestParams;
  sink: Sink<ExecutionResult<TestData>>;
  unsubscribe: Mock;
};

let subscriptions: FakeSubscription[];

const activeSubscriptions = () =>
  subscriptions.filter(
    ({ unsubscribe }) => unsubscribe.mock.calls.length === 0
  );

const lastSubscription = () => subscriptions[subscriptions.length - 1];

const renderSubscription = (
  props: TestHookProps,
  wrapper?: typeof StrictMode
) =>
  renderHook(
    ({
      document = DOCUMENT,
      variables,
      onNext,
      onError,
      enabled,
    }: TestHookProps) =>
      useGraphqlSubscription<TestData, TestVariables>(document, variables, {
        onNext,
        onError,
        enabled,
      }),
    { initialProps: props, wrapper }
  );

const unauthenticatedEvent = (): ExecutionResult<TestData> =>
  ({
    data: DATA,
    errors: [
      {
        message: 'Not authorized: You are not authenticated',
        extensions: { code: 'UNAUTHENTICATED' },
      },
    ],
  }) as ExecutionResult<TestData>;

const forbiddenEvent = (): ExecutionResult<TestData> =>
  ({
    data: DATA,
    errors: [
      { message: FORBIDDEN_MESSAGE, extensions: { code: 'FORBIDDEN_ACCESS' } },
    ],
  }) as ExecutionResult<TestData>;

describe('useGraphqlSubscription', () => {
  beforeEach(() => {
    subscriptions = [];
    vi.mocked(getSseClient).mockReturnValue({
      subscribe: vi.fn(
        (request: RequestParams, sink: Sink<ExecutionResult<TestData>>) => {
          const unsubscribe = vi.fn();
          subscriptions.push({ request, sink, unsubscribe });
          return unsubscribe;
        }
      ),
    } as unknown as Client<true>);
    sendReport = vi.fn(() => Promise.resolve({ frontendErrorLog: true }));
    vi.spyOn(useFrontendErrorLogMutation, 'fetcher').mockReturnValue(
      sendReport
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('subscription lifecycle', () => {
    it('should hand the data of an event to onNext', () => {
      // Given
      const onNext = vi.fn();
      renderSubscription({ variables: VARIABLES, onNext });

      // When
      lastSubscription().sink.next({ data: DATA });

      // Then
      expect(onNext).toHaveBeenCalledWith(DATA);
    });

    it.each([{}, { data: null }])(
      'should ignore an event without data or errors: %o',
      (event) => {
        // Given
        const onNext = vi.fn();
        const onError = vi.fn();
        renderSubscription({ variables: VARIABLES, onNext, onError });

        // When
        lastSubscription().sink.next(event as ExecutionResult<TestData>);

        // Then
        expect(onNext).not.toHaveBeenCalled();
        expect(onError).not.toHaveBeenCalled();
      }
    );

    it('should subscribe with the operation name extracted from the document and the variables', () => {
      // Given / When
      renderSubscription({ variables: VARIABLES, onNext: vi.fn() });

      // Then
      expect(lastSubscription().request).toEqual({
        operationName: OPERATION_NAME,
        query: DOCUMENT,
        variables: VARIABLES,
      });
    });

    it('should subscribe without an operation name when the document has none', () => {
      // Given / When
      renderSubscription({
        document: ANONYMOUS_DOCUMENT,
        variables: VARIABLES,
        onNext: vi.fn(),
      });

      // Then
      expect(lastSubscription().request).not.toHaveProperty('operationName');
    });

    it('should report an error of an anonymous document under the fallback label', () => {
      // Given
      renderSubscription({
        document: ANONYMOUS_DOCUMENT,
        variables: VARIABLES,
        onNext: vi.fn(),
      });

      // When
      lastSubscription().sink.next(forbiddenEvent());

      // Then
      expect(useFrontendErrorLogMutation.fetcher).toHaveBeenCalledWith(
        portalGraphqlClient,
        expect.objectContaining({
          message: reportedMessage(
            ANONYMOUS_OPERATION_LABEL,
            FORBIDDEN_MESSAGE
          ),
        })
      );
    });

    it('should unsubscribe when the component unmounts', () => {
      // Given
      const { unmount } = renderSubscription({
        variables: VARIABLES,
        onNext: vi.fn(),
      });

      // When
      unmount();

      // Then
      expect(activeSubscriptions()).toHaveLength(0);
    });

    it('should keep a single active subscription when rendered in StrictMode', () => {
      // Given / When
      renderSubscription({ variables: VARIABLES, onNext: vi.fn() }, StrictMode);

      // Then
      expect(subscriptions).toHaveLength(2);
      expect(activeSubscriptions()).toHaveLength(1);
    });

    it('should hand an exception thrown by onNext to onError', () => {
      // Given
      const exception = new Error(ON_NEXT_EXCEPTION_MESSAGE);
      const onError = vi.fn();
      renderSubscription({
        variables: VARIABLES,
        onNext: () => {
          throw exception;
        },
        onError,
      });

      // When
      lastSubscription().sink.next({ data: DATA });

      // Then
      expect(onError).toHaveBeenCalledWith(exception);
    });

    it('should keep the subscription open when onNext throws', () => {
      // Given
      const onNext = vi.fn(() => {
        throw new Error(ON_NEXT_EXCEPTION_MESSAGE);
      });
      renderSubscription({ variables: VARIABLES, onNext, onError: vi.fn() });
      const sink = lastSubscription().sink;

      // When
      const deliverEvent = () => sink.next({ data: DATA });

      // Then
      // graphql-sse ends a subscription whose sink throws.
      expect(deliverEvent).not.toThrow();
      deliverEvent();
      expect(onNext).toHaveBeenCalledTimes(2);
      expect(activeSubscriptions()).toHaveLength(1);
    });
  });

  describe('resubscription', () => {
    it.each([
      {
        description: 'a copy of the same variables',
        nextVariables: { ...VARIABLES },
      },
      {
        description: 'the same variables with their keys reordered',
        nextVariables: { first: FIRST, organizationId: ORGANIZATION_ID },
      },
    ])(
      'should not resubscribe when rerendered with $description',
      ({ nextVariables }) => {
        // Given
        const onNext = vi.fn();
        const { rerender } = renderSubscription({
          variables: VARIABLES,
          onNext,
        });

        // When
        rerender({ variables: nextVariables, onNext });

        // Then
        expect(subscriptions).toHaveLength(1);
      }
    );

    it('should replace the subscription with one on the new variables when their value changes', () => {
      // Given
      const onNext = vi.fn();
      const nextVariables = {
        ...VARIABLES,
        organizationId: OTHER_ORGANIZATION_ID,
      };
      const { rerender } = renderSubscription({ variables: VARIABLES, onNext });

      // When
      rerender({ variables: nextVariables, onNext });

      // Then
      expect(
        activeSubscriptions().map(({ request }) => request.variables)
      ).toEqual([nextVariables]);
    });

    it('should replace the subscription with one on the new document when it changes', () => {
      // Given
      const onNext = vi.fn();
      const { rerender } = renderSubscription({ variables: VARIABLES, onNext });

      // When
      rerender({ document: OTHER_DOCUMENT, variables: VARIABLES, onNext });

      // Then
      expect(activeSubscriptions().map(({ request }) => request.query)).toEqual(
        [OTHER_DOCUMENT]
      );
    });

    it('should not resubscribe when only the callbacks change', () => {
      // Given
      const { rerender } = renderSubscription({
        variables: VARIABLES,
        onNext: vi.fn(),
        onError: vi.fn(),
      });

      // When
      rerender({ variables: VARIABLES, onNext: vi.fn(), onError: vi.fn() });

      // Then
      expect(subscriptions).toHaveLength(1);
    });

    it('should hand the data to the latest onNext', () => {
      // Given
      const firstOnNext = vi.fn();
      const latestOnNext = vi.fn();
      const { rerender } = renderSubscription({
        variables: VARIABLES,
        onNext: firstOnNext,
      });
      rerender({ variables: VARIABLES, onNext: latestOnNext });

      // When
      lastSubscription().sink.next({ data: DATA });

      // Then
      expect(latestOnNext).toHaveBeenCalledWith(DATA);
      expect(firstOnNext).not.toHaveBeenCalled();
    });

    it('should hand an error to the latest onError', () => {
      // Given
      const firstOnError = vi.fn();
      const latestOnError = vi.fn();
      const onNext = vi.fn();
      const { rerender } = renderSubscription({
        variables: VARIABLES,
        onNext,
        onError: firstOnError,
      });
      rerender({ variables: VARIABLES, onNext, onError: latestOnError });

      // When
      lastSubscription().sink.error(new NetworkError(TRANSPORT_ERROR_MESSAGE));

      // Then
      expect(latestOnError).toHaveBeenCalledWith(
        expect.objectContaining({ message: TRANSPORT_ERROR_MESSAGE })
      );
      expect(firstOnError).not.toHaveBeenCalled();
    });
  });

  describe('enabled', () => {
    it('should not subscribe when enabled is false', () => {
      // Given / When
      renderSubscription({
        variables: VARIABLES,
        onNext: vi.fn(),
        enabled: false,
      });

      // Then
      expect(subscriptions).toHaveLength(0);
    });

    it('should subscribe when enabled turns true', () => {
      // Given
      const onNext = vi.fn();
      const { rerender } = renderSubscription({
        variables: VARIABLES,
        onNext,
        enabled: false,
      });

      // When
      rerender({ variables: VARIABLES, onNext, enabled: true });

      // Then
      expect(activeSubscriptions()).toHaveLength(1);
    });

    it('should unsubscribe when enabled turns back to false', () => {
      // Given
      const onNext = vi.fn();
      const { rerender } = renderSubscription({
        variables: VARIABLES,
        onNext,
        enabled: true,
      });

      // When
      rerender({ variables: VARIABLES, onNext, enabled: false });

      // Then
      expect(activeSubscriptions()).toHaveLength(0);
    });
  });

  describe('expired session', () => {
    it('should redirect to the login page when an event carries an UNAUTHENTICATED error', () => {
      // Given
      renderSubscription({
        variables: VARIABLES,
        onNext: vi.fn(),
        onError: vi.fn(),
      });

      // When
      lastSubscription().sink.next(unauthenticatedEvent());

      // Then
      expect(redirectToLogin).toHaveBeenCalledTimes(1);
    });

    it.each([
      { callback: 'onNext' as const },
      { callback: 'onError' as const },
    ])(
      'should not call $callback when an event carries an UNAUTHENTICATED error',
      ({ callback }) => {
        // Given
        const callbacks = { onNext: vi.fn(), onError: vi.fn() };
        renderSubscription({ variables: VARIABLES, ...callbacks });

        // When
        lastSubscription().sink.next(unauthenticatedEvent());

        // Then
        expect(callbacks[callback]).not.toHaveBeenCalled();
      }
    );

    it('should not report the error to the API when there is no onError', () => {
      // Given
      renderSubscription({ variables: VARIABLES, onNext: vi.fn() });

      // When
      lastSubscription().sink.next(unauthenticatedEvent());

      // Then
      expect(sendReport).not.toHaveBeenCalled();
    });
  });

  describe('other errors', () => {
    const errorCases = [
      {
        channel: 'a GraphQL error in an event',
        emit: (sink: FakeSubscription['sink']) => sink.next(forbiddenEvent()),
        message: FORBIDDEN_MESSAGE,
      },
      {
        channel: 'a transport error',
        emit: (sink: FakeSubscription['sink']) =>
          sink.error(new NetworkError(TRANSPORT_ERROR_MESSAGE)),
        message: TRANSPORT_ERROR_MESSAGE,
      },
    ];

    it.each(errorCases)(
      'should hand $channel to onError',
      ({ emit, message }) => {
        // Given
        const onError = vi.fn();
        renderSubscription({ variables: VARIABLES, onNext: vi.fn(), onError });

        // When
        emit(lastSubscription().sink);

        // Then
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({ message })
        );
      }
    );

    it.each(errorCases)(
      'should report $channel to the API through portalGraphqlClient when there is no onError',
      ({ emit, message }) => {
        // Given
        renderSubscription({ variables: VARIABLES, onNext: vi.fn() });

        // When
        emit(lastSubscription().sink);

        // Then
        expect(useFrontendErrorLogMutation.fetcher).toHaveBeenCalledWith(
          portalGraphqlClient,
          {
            message: reportedMessage(OPERATION_NAME, message),
            codeStack: expect.any(String),
            componentStack: null,
          }
        );
        expect(sendReport).toHaveBeenCalledTimes(1);
      }
    );

    it.each(errorCases)(
      'should report an exception thrown by onError on $channel without throwing',
      ({ emit }) => {
        // Given
        renderSubscription({
          variables: VARIABLES,
          onNext: vi.fn(),
          onError: () => {
            throw new Error(ON_ERROR_EXCEPTION_MESSAGE);
          },
        });

        // When
        const emitError = () => emit(lastSubscription().sink);

        // Then
        expect(emitError).not.toThrow();
        expect(useFrontendErrorLogMutation.fetcher).toHaveBeenCalledWith(
          portalGraphqlClient,
          expect.objectContaining({
            message: reportedMessage(
              OPERATION_NAME,
              ON_ERROR_EXCEPTION_MESSAGE
            ),
          })
        );
      }
    );

    it.each(errorCases)(
      'should not redirect to the login page on $channel',
      ({ emit }) => {
        // Given
        renderSubscription({
          variables: VARIABLES,
          onNext: vi.fn(),
          onError: vi.fn(),
        });

        // When
        emit(lastSubscription().sink);

        // Then
        expect(redirectToLogin).not.toHaveBeenCalled();
      }
    );

    it.each(errorCases)(
      'should swallow a failed report of $channel without throwing or leaving an unhandled rejection',
      async ({ emit }) => {
        // Given
        const unhandledRejection = vi.fn();
        process.on('unhandledRejection', unhandledRejection);
        // Not a vi.fn: a mock records the promise it returns, which marks its
        // rejection as handled and would hide a missing catch in the hook.
        const failingReport = () =>
          Promise.reject(new Error(REPORT_FAILURE_MESSAGE));
        vi.mocked(useFrontendErrorLogMutation.fetcher).mockReturnValue(
          failingReport
        );
        renderSubscription({ variables: VARIABLES, onNext: vi.fn() });

        try {
          // When
          const emitError = () => emit(lastSubscription().sink);

          // Then
          expect(emitError).not.toThrow();
          await flushUnhandledRejections();
          expect(useFrontendErrorLogMutation.fetcher).toHaveBeenCalledTimes(1);
          expect(unhandledRejection).not.toHaveBeenCalled();
        } finally {
          process.off('unhandledRejection', unhandledRejection);
        }
      }
    );

    it('should not hand the data of an event that carries an error to onNext', () => {
      // Given
      const onNext = vi.fn();
      renderSubscription({ variables: VARIABLES, onNext, onError: vi.fn() });

      // When
      lastSubscription().sink.next(forbiddenEvent());

      // Then
      expect(onNext).not.toHaveBeenCalled();
    });
  });
});
