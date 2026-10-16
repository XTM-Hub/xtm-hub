import SignUpErrorSnackbar from '@/components/signup/SignUpErrorSnackbar';
import testRender from '@/utils/test/test-render';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {
  ReadonlyURLSearchParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const showSnackbarMock = vi.hoisted(() => vi.fn());
const replaceMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: showSnackbarMock,
}));

const SIGN_UP_PATH = '/sign-up';
// 12 characters encode to unpadded base64 without `+` or `/`, so the value
// reads the same once URL-encoded again.
const ENCODED_REDIRECT = btoa('/app/profile');

const renderSnackbar = (search: string) => {
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams(search) as ReadonlyURLSearchParams
  );
  return testRender(<SignUpErrorSnackbar />);
};

describe('SignUpErrorSnackbar', () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue(SIGN_UP_PATH);
    vi.mocked(useRouter).mockReturnValue({
      replace: replaceMock,
    } as unknown as AppRouterInstance);
  });

  it.each`
    error                   | title                                       | description
    ${'email-not-verified'} | ${'SignUpPage.EmailNotVerifiedError.Title'} | ${'SignUpPage.EmailNotVerifiedError.Description'}
    ${'login-failed'}       | ${'UnexpectedErrorDialog.Title'}            | ${'UnexpectedErrorDialog.Description'}
    ${'unknown-reason'}     | ${'UnexpectedErrorDialog.Title'}            | ${'UnexpectedErrorDialog.Description'}
  `(
    'should show the $title error snackbar when the error param is $error',
    ({
      error,
      title,
      description,
    }: {
      error: string;
      title: string;
      description: string;
    }) => {
      // Given the backend redirected a failed sign-in with an error reason
      const search = `error=${error}`;

      // When the sign-up page renders
      renderSnackbar(search);

      // Then the matching error message is shown
      expect(showSnackbarMock).toHaveBeenCalledWith({
        severity: 'error',
        title,
        description,
      });
    }
  );

  it.each`
    search                                                     | expectedUrl
    ${'error=login-failed'}                                    | ${SIGN_UP_PATH}
    ${`error=email-not-verified&redirect=${ENCODED_REDIRECT}`} | ${`${SIGN_UP_PATH}?redirect=${ENCODED_REDIRECT}`}
  `(
    'should replace the URL with $expectedUrl when the search is $search',
    ({ search, expectedUrl }: { search: string; expectedUrl: string }) => {
      // Given a sign-up URL carrying an error reason

      // When the sign-up page renders
      renderSnackbar(search);

      // Then the error param is dropped and the other params are kept
      expect(replaceMock).toHaveBeenCalledWith(expectedUrl);
    }
  );

  it.each`
    search                            | context
    ${''}                             | ${'there is no search param'}
    ${`redirect=${ENCODED_REDIRECT}`} | ${'there is only a redirect param'}
    ${'error='}                       | ${'the error param is empty'}
  `(
    'should not show any snackbar when $context',
    ({ search }: { search: string }) => {
      // Given a sign-up URL without an error reason

      // When the sign-up page renders
      renderSnackbar(search);

      // Then no error message is shown
      expect(showSnackbarMock).not.toHaveBeenCalled();
    }
  );
});
