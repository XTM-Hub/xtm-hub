import LoginForm from '@/components/login/LoginForm';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { USER_PROPERTIES_WAIT_MS } from '@/lib/analytics/analytics.consts';
import testRender from '@/utils/test/test-render';
import { QueryClient } from '@tanstack/react-query';
import { act, fireEvent, screen } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { afterEach, describe, expect, it, vi } from 'vitest';

const EMAIL = 'jane@acme.com';
const PASSWORD = 'password';
const REDIRECT_PATH = '/app/service/opencti_custom_dashboards';

const mocks = vi.hoisted(() => ({
  // Every login succeeds unless a test makes it fail.
  loginOutcome: 'success' as 'success' | 'error',
  login: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useLoginMutation: (
    _client: unknown,
    options: { onSuccess: () => void; onError: () => void }
  ) => ({
    mutate: (variables: unknown) => {
      mocks.login(variables);
      if (mocks.loginOutcome === 'success') {
        options.onSuccess();
      } else {
        options.onError();
      }
    },
  }),
}));

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: vi.fn(),
}));

const submitCredentials = () => {
  fireEvent.change(screen.getByLabelText('LoginPage.Email'), {
    target: { value: EMAIL },
  });
  fireEvent.change(screen.getByLabelText('LoginPage.Password'), {
    target: { value: PASSWORD },
  });
  fireEvent.click(screen.getByRole('button', { name: 'LoginPage.SignIn' }));
};

afterEach(() => {
  mocks.loginOutcome = 'success';
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('LoginForm', () => {
  it.each([
    ['not refresh', USER_PROPERTIES_WAIT_MS - 1, 0],
    ['refresh', USER_PROPERTIES_WAIT_MS, 1],
  ])(
    'should %s the page %s ms after a successful login when the analytics user is still refreshing',
    async (_outcome, elapsedMs, refreshCount) => {
      // Given
      vi.useFakeTimers();
      vi.spyOn(QueryClient.prototype, 'invalidateQueries').mockReturnValue(
        new Promise(() => undefined)
      );
      testRender(<LoginForm />);
      submitCredentials();

      // When
      await act(() => vi.advanceTimersByTimeAsync(elapsedMs));

      // Then
      expect(vi.mocked(useRouter)().refresh).toHaveBeenCalledTimes(
        refreshCount
      );
    }
  );

  it('should send the typed credentials when the visitor signs in', async () => {
    // Given
    testRender(<LoginForm />);

    // When
    submitCredentials();

    // Then
    await vi.waitFor(() =>
      expect(mocks.login).toHaveBeenCalledWith({
        email: EMAIL,
        password: PASSWORD,
      })
    );
  });

  it('should go to the requested page after a successful login when a redirect is given', async () => {
    // Given
    vi.spyOn(QueryClient.prototype, 'invalidateQueries').mockResolvedValue();
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams({
        redirect: btoa(REDIRECT_PATH),
      }) as unknown as ReturnType<typeof useSearchParams>
    );
    testRender(<LoginForm />);

    // When
    submitCredentials();

    // Then
    await vi.waitFor(() =>
      expect(vi.mocked(useRouter)().push).toHaveBeenCalledWith(REDIRECT_PATH)
    );
  });

  it('should show an error when the login request fails', async () => {
    // Given
    mocks.loginOutcome = 'error';
    testRender(<LoginForm />);

    // When
    submitCredentials();

    // Then
    await vi.waitFor(() =>
      expect(showSnackbar).toHaveBeenCalledWith({
        severity: 'error',
        title: 'Utils.Error',
        description: 'Error.Login.LoginError',
      })
    );
  });
});
