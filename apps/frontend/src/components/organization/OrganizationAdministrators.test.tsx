import { OrganizationAdministrators } from '@/components/organization/OrganizationAdministrators';
import {
  mockTranslations,
  translateWithValues,
} from '@/utils/test/mock-translations';
import testRender from '@/utils/test/test-render';
import { screen, waitFor, within } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { showSnackbarMock } = vi.hoisted(() => ({ showSnackbarMock: vi.fn() }));

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: showSnackbarMock,
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const FIRST_EMAIL = 'alice@filigran.io';
const SECOND_EMAIL = 'bob@filigran.io';
const THIRD_EMAIL = 'carol@filigran.io';
const ADMINISTRATOR_EMAILS = [FIRST_EMAIL, SECOND_EMAIL, THIRD_EMAIL];
const OTHER_ADMINISTRATORS_COUNT = ADMINISTRATOR_EMAILS.length - 1;
const OTHER_ADMINISTRATORS_CHIP = `+${OTHER_ADMINISTRATORS_COUNT}`;
const POPOVER_TITLE = translateWithValues(
  'OrganizationForm.AdministratorsPopoverTitle',
  { count: ADMINISTRATOR_EMAILS.length }
);
const COPY_ALL_LABEL = 'OrganizationForm.CopyAll';
const CLOSE_LABEL = 'Utils.Close';

const copyEmailLabel = (email: string) =>
  translateWithValues('OrganizationForm.CopyAdministratorEmail', { email });

const otherAdministratorsLabel = (count: number) =>
  translateWithValues('OrganizationForm.OtherAdministrators', { count });

const OTHER_ADMINISTRATORS_LABEL = otherAdministratorsLabel(
  OTHER_ADMINISTRATORS_COUNT
);

const renderAdministrators = (emails: string[] | null) =>
  testRender(<OrganizationAdministrators emails={emails} />);

const openPopover = async (
  user: ReturnType<typeof renderAdministrators>['user']
) => {
  await user.click(
    screen.getByRole('button', { name: OTHER_ADMINISTRATORS_LABEL })
  );
  return screen.findByRole('dialog', { name: POPOVER_TITLE });
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OrganizationAdministrators', () => {
  beforeEach(() => {
    vi.mocked(useTranslations).mockReturnValue(
      mockTranslations({ translate: translateWithValues })
    );
    showSnackbarMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([[[]], [null]])(
    'should display no administrator when the organization has none (%j)',
    (emails) => {
      // Given / When
      renderAdministrators(emails);

      // Then
      expect(
        screen.getByText('OrganizationForm.NoAdministrator')
      ).toBeInTheDocument();
    }
  );

  it('should show no chip when the organization has a single administrator', () => {
    // Given
    const emails = [FIRST_EMAIL];

    // When
    renderAdministrators(emails);

    // Then
    expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
  });

  it('should display the first administrator email', () => {
    // Given / When
    renderAdministrators(ADMINISTRATOR_EMAILS);

    // Then
    expect(screen.getByText(FIRST_EMAIL)).toBeInTheDocument();
  });

  it('should count the other administrators in a chip when the organization has several administrators', () => {
    // Given / When
    renderAdministrators(ADMINISTRATOR_EMAILS);

    // Then
    expect(
      screen.getByRole('button', { name: OTHER_ADMINISTRATORS_LABEL })
    ).toHaveTextContent(OTHER_ADMINISTRATORS_CHIP);
  });

  it('should open the administrators popover when pressing Enter on the chip', async () => {
    // Given
    const { user } = renderAdministrators(ADMINISTRATOR_EMAILS);
    screen.getByRole('button', { name: OTHER_ADMINISTRATORS_LABEL }).focus();

    // When
    await user.keyboard('{Enter}');

    // Then
    expect(
      await screen.findByRole('dialog', { name: POPOVER_TITLE })
    ).toBeInTheDocument();
  });

  it('should list every administrator email in the popover', async () => {
    // Given
    const { user } = renderAdministrators(ADMINISTRATOR_EMAILS);

    // When
    const popover = await openPopover(user);

    // Then
    expect(
      within(popover)
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    ).toEqual(ADMINISTRATOR_EMAILS);
  });

  it('should write the email to the clipboard when copying it in the cell', async () => {
    // Given
    const { user } = renderAdministrators(ADMINISTRATOR_EMAILS);
    // userEvent.setup() installs its own clipboard stub, so read it after render
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');

    // When
    await user.click(
      screen.getByRole('button', { name: copyEmailLabel(FIRST_EMAIL) })
    );

    // Then
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(FIRST_EMAIL));
  });

  it('should write the email to the clipboard when copying it in the popover', async () => {
    // Given
    const { user } = renderAdministrators(ADMINISTRATOR_EMAILS);
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    const popover = await openPopover(user);

    // When
    await user.click(
      within(popover).getByRole('button', { name: copyEmailLabel(THIRD_EMAIL) })
    );

    // Then
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(THIRD_EMAIL));
  });

  it('should write every email separated by a comma to the clipboard when copying all', async () => {
    // Given
    const { user } = renderAdministrators(ADMINISTRATOR_EMAILS);
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    await openPopover(user);

    // When
    await user.click(screen.getByRole('button', { name: COPY_ALL_LABEL }));

    // Then
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(ADMINISTRATOR_EMAILS.join(', '))
    );
  });

  it.each`
    outcome        | writeText                                    | expectedSnackbar
    ${'succeeds'}  | ${() => Promise.resolve()}                   | ${{ severity: 'success', title: 'Utils.Copied' }}
    ${'is denied'} | ${() => Promise.reject(new Error('denied'))} | ${{ severity: 'error', title: 'Utils.FailedToCopy' }}
  `(
    'should tell the user the result when the copy $outcome',
    async ({ writeText, expectedSnackbar }) => {
      // Given
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { user } = renderAdministrators([FIRST_EMAIL]);
      vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeText);

      // When
      await user.click(
        screen.getByRole('button', { name: copyEmailLabel(FIRST_EMAIL) })
      );

      // Then
      await waitFor(() =>
        expect(showSnackbarMock).toHaveBeenCalledWith(expectedSnackbar)
      );
    }
  );

  it('should close the administrators popover when clicking the cross', async () => {
    // Given
    const { user } = renderAdministrators(ADMINISTRATOR_EMAILS);
    const popover = await openPopover(user);

    // When
    await user.click(
      within(popover).getByRole('button', { name: CLOSE_LABEL })
    );

    // Then
    await waitFor(() => expect(popover).not.toBeInTheDocument());
  });

  it('should give the focus back to the chip when the cross closes the popover', async () => {
    // Given
    const { user } = renderAdministrators(ADMINISTRATOR_EMAILS);
    const popover = await openPopover(user);

    // When
    await user.click(
      within(popover).getByRole('button', { name: CLOSE_LABEL })
    );

    // Then
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: OTHER_ADMINISTRATORS_LABEL })
      ).toHaveFocus()
    );
  });
});
