import EmailNotVerifiedNotice from '@/components/signup/EmailNotVerifiedNotice';
import { ResendVerificationEmailError } from '@/components/signup/resend-verification-email.utils';
import { useResendVerificationEmail } from '@/components/signup/use-resend-verification-email';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { ReadonlyURLSearchParams, useSearchParams } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const showSnackbarMock = vi.hoisted(() => vi.fn());
const mutateMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: showSnackbarMock,
}));

vi.mock('@/components/signup/use-resend-verification-email', () => ({
  useResendVerificationEmail: vi.fn(),
}));

const EMAIL_NOT_VERIFIED_SEARCH = 'error=email-not-verified';
const NOTICE_TITLE = 'SignUpPage.EmailNotVerifiedError.Title';
const RESEND_LABEL = 'SignUpPage.ResendVerificationEmail.Button';
const SENT_LABEL = 'SignUpPage.ResendVerificationEmail.Sent';

interface MutationState {
  isPending?: boolean;
  isSuccess?: boolean;
}

type MutationResult = ReturnType<typeof useResendVerificationEmail>;

// Only the fields the component reads: the rest of the react-query result is
// irrelevant to it.
const mockMutation = ({
  isPending = false,
  isSuccess = false,
}: MutationState = {}) =>
  vi.mocked(useResendVerificationEmail).mockReturnValue({
    mutate: mutateMock,
    isPending,
    isSuccess,
  } as unknown as MutationResult);

const mockSearch = (search: string) =>
  vi
    .mocked(useSearchParams)
    .mockReturnValue(new URLSearchParams(search) as ReadonlyURLSearchParams);

const renderNotice = (search: string) => {
  mockSearch(search);
  return testRender(<EmailNotVerifiedNotice />);
};

type MutateCallbacks = {
  onSuccess: () => void;
  onError: (error: unknown) => void;
};

describe('EmailNotVerifiedNotice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutation();
  });

  it('should offer to resend the verification email when the error param is email-not-verified', () => {
    // Given a sign-in refused because the email is not verified

    // When the sign-up page renders
    renderNotice(EMAIL_NOT_VERIFIED_SEARCH);

    // Then the resend action is offered
    expect(screen.getByRole('button', { name: RESEND_LABEL })).toBeEnabled();
  });

  it.each`
    search                  | context
    ${'error=login-failed'} | ${'the error param is login-failed'}
    ${'error='}             | ${'the error param is empty'}
    ${''}                   | ${'there is no error param'}
  `('should not render anything when $context', ({ search }) => {
    // Given a sign-up URL without the email-not-verified reason

    // When the sign-up page renders
    renderNotice(search);

    // Then neither the notice nor its action is shown
    expect(screen.queryByText(NOTICE_TITLE)).not.toBeInTheDocument();
  });

  it('should keep the resend action when the error param is removed from the URL', () => {
    // Given the notice rendered for an unverified email
    const { rerender } = renderNotice(EMAIL_NOT_VERIFIED_SEARCH);

    // When the error param is dropped from the URL
    mockSearch('');
    rerender(<EmailNotVerifiedNotice />);

    // Then the resend action is still offered
    expect(screen.getByRole('button', { name: RESEND_LABEL })).toBeEnabled();
  });

  it('should request a verification email when the resend button is clicked', async () => {
    // Given the notice rendered for an unverified email
    const { user } = renderNotice(EMAIL_NOT_VERIFIED_SEARCH);

    // When the user asks for a new email
    await user.click(screen.getByRole('button', { name: RESEND_LABEL }));

    // Then the request is sent
    expect(mutateMock).toHaveBeenCalledTimes(1);
  });

  it.each`
    state                  | context
    ${{ isPending: true }} | ${'the request is pending'}
    ${{ isSuccess: true }} | ${'the email was sent'}
  `(
    'should disable the resend button when $context',
    ({ state }: { state: MutationState }) => {
      // Given the resend request in the given state
      mockMutation(state);

      // When the notice renders
      renderNotice(EMAIL_NOT_VERIFIED_SEARCH);

      // Then the button cannot be clicked again
      expect(screen.getByRole('button')).toBeDisabled();
    }
  );

  it('should tell the email was sent when the request succeeded', () => {
    // Given a resend request that succeeded
    mockMutation({ isSuccess: true });

    // When the notice renders
    renderNotice(EMAIL_NOT_VERIFIED_SEARCH);

    // Then the button says the email is on its way
    expect(
      screen.getByRole('button', { name: SENT_LABEL })
    ).toBeInTheDocument();
  });

  it('should confirm the email was sent when the request succeeds', async () => {
    // Given a resend request that succeeds
    mutateMock.mockImplementation(
      (_variables: undefined, { onSuccess }: MutateCallbacks) => onSuccess()
    );
    const { user } = renderNotice(EMAIL_NOT_VERIFIED_SEARCH);

    // When the user asks for a new email
    await user.click(screen.getByRole('button', { name: RESEND_LABEL }));

    // Then a success message is shown
    expect(showSnackbarMock).toHaveBeenCalledWith({
      severity: 'success',
      title: 'SignUpPage.ResendVerificationEmail.Success.Title',
      description: 'SignUpPage.ResendVerificationEmail.Success.Description',
    });
  });

  it('should show the message matching the failure when the request fails', async () => {
    // Given a resend request refused for being too frequent
    mutateMock.mockImplementation(
      (_variables: undefined, { onError }: MutateCallbacks) =>
        onError(new ResendVerificationEmailError('TOO_MANY_REQUESTS'))
    );
    const { user } = renderNotice(EMAIL_NOT_VERIFIED_SEARCH);

    // When the user asks for a new email
    await user.click(screen.getByRole('button', { name: RESEND_LABEL }));

    // Then the matching error message is shown
    expect(showSnackbarMock).toHaveBeenCalledWith({
      severity: 'error',
      title: 'SignUpPage.ResendVerificationEmail.TooManyRequests.Title',
      description:
        'SignUpPage.ResendVerificationEmail.TooManyRequests.Description',
    });
  });
});
