import LoginForm from '@/components/login/LoginForm';
import { USER_PROPERTIES_WAIT_MS } from '@/lib/analytics/analytics.consts';
import testRender from '@/utils/test/test-render';
import { QueryClient } from '@tanstack/react-query';
import { act, fireEvent, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { afterEach, describe, expect, it, vi } from 'vitest';

const EMAIL = 'jane@acme.com';
const PASSWORD = 'password';

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-relay')>()),
  useMutation: () => [
    (config: { onCompleted: () => void }) => config.onCompleted(),
    false,
  ],
}));

afterEach(() => {
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
      fireEvent.change(screen.getByLabelText('LoginPage.Email'), {
        target: { value: EMAIL },
      });
      fireEvent.change(screen.getByLabelText('LoginPage.Password'), {
        target: { value: PASSWORD },
      });
      fireEvent.click(screen.getByRole('button', { name: 'LoginPage.SignIn' }));

      // When
      await act(() => vi.advanceTimersByTimeAsync(elapsedMs));

      // Then
      expect(vi.mocked(useRouter)().refresh).toHaveBeenCalledTimes(
        refreshCount
      );
    }
  );
});
