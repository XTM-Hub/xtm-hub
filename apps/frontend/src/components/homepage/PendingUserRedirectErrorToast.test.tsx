import PendingUserRedirectErrorToast from '@/components/homepage/PendingUserRedirectErrorToast';
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

const renderToast = (search: string) => {
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams(search) as ReadonlyURLSearchParams
  );
  return testRender(<PendingUserRedirectErrorToast />);
};

describe('PendingUserRedirectErrorToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePathname).mockReturnValue('/app');
    vi.mocked(useRouter).mockReturnValue({
      replace: replaceMock,
    } as unknown as AppRouterInstance);
  });

  it('shows a destructive toast and strips the error param when unauthorized', () => {
    renderToast('error=pending_user_unauthorized');

    expect(showSnackbarMock).toHaveBeenCalledWith({
      severity: 'error',
      title: 'PendingUserRedirect.Unauthorized.Title',
      description: 'PendingUserRedirect.Unauthorized.Description',
    });
    expect(replaceMock).toHaveBeenCalledWith('/app');
  });

  it('keeps the other query params when stripping the error param', () => {
    renderToast('error=pending_user_unauthorized&foo=bar');

    expect(replaceMock).toHaveBeenCalledWith('/app?foo=bar');
  });

  it.each`
    search                    | description
    ${''}                     | ${'no error param'}
    ${'error=something_else'} | ${'an unrelated error param'}
  `(
    'does nothing when there is $description',
    ({ search }: { search: string }) => {
      renderToast(search);

      expect(showSnackbarMock).not.toHaveBeenCalled();
      expect(replaceMock).not.toHaveBeenCalled();
    }
  );
});
