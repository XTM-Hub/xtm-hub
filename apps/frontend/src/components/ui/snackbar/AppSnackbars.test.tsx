import testRender from '@/utils/test/test-render';
import { act, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type SnackbarStoreModule =
  typeof import('@/components/ui/snackbar/snackbar-store');
type AppSnackbarsModule =
  typeof import('@/components/ui/snackbar/AppSnackbars');

const TITLE = 'Profile updated';
const DESCRIPTION = 'Your changes are saved.';
const FIRST_TITLE = 'First message';
const SECOND_TITLE = 'Second message';
const CLOSE_LABEL = 'Utils.Close';

let showSnackbar: SnackbarStoreModule['showSnackbar'];
let AppSnackbars: AppSnackbarsModule['AppSnackbars'];

describe('AppSnackbars', () => {
  // The messages live at module level: a fresh module per test keeps one
  // test's messages out of the next.
  beforeEach(async () => {
    vi.resetModules();
    ({ showSnackbar } =
      await import('@/components/ui/snackbar/snackbar-store'));
    ({ AppSnackbars } = await import('@/components/ui/snackbar/AppSnackbars'));
  });

  it('should show the title and description when a message is raised', async () => {
    // Given
    testRender(<AppSnackbars />);

    // When
    act(() => {
      showSnackbar({
        severity: 'success',
        title: TITLE,
        description: DESCRIPTION,
      });
    });

    // Then
    expect(await screen.findByText(TITLE)).toBeInTheDocument();
    expect(screen.getByText(DESCRIPTION)).toBeInTheDocument();
  });

  it('should close the open message when another one is raised', async () => {
    // Given
    testRender(<AppSnackbars />);
    act(() => {
      showSnackbar({ severity: 'error', title: FIRST_TITLE });
    });
    await screen.findByText(FIRST_TITLE);

    // When
    act(() => {
      showSnackbar({ severity: 'success', title: SECOND_TITLE });
    });

    // Then
    expect(await screen.findByText(SECOND_TITLE)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(FIRST_TITLE)).not.toBeInTheDocument();
    });
  });

  it('should dismiss the message when its translated close control is clicked', async () => {
    // Given
    const { user } = testRender(<AppSnackbars />);
    act(() => {
      showSnackbar({ severity: 'success', title: TITLE });
    });

    // When
    await user.click(await screen.findByRole('button', { name: CLOSE_LABEL }));

    // Then
    await waitFor(() => {
      expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
    });
  });
});
