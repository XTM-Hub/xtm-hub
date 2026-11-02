import { ProfileFormPicture } from '@/components/profile/form/Picture';
import testRender from '@/utils/test/test-render';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CURRENT_PICTURE_URL = 'https://filigran.io/current-picture.png';
const FIRST_PREVIEW_URL = 'blob:first-preview';
const SECOND_PREVIEW_URL = 'blob:second-preview';

const makeImageFile = (name: string) =>
  new File(['picture'], name, { type: 'image/png' });

// jsdom never loads images: every picture is reported as already loaded so the Avatar shows it.
class LoadedImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  complete = true;
  naturalWidth = 64;
  src = '';
}

const getFileInput = (container: HTMLElement) =>
  container.querySelector<HTMLInputElement>('input[type="file"]')!;

// The picture is decorative (empty alt), hence its "presentation" role.
const getDisplayedPicture = () => screen.getByRole('presentation');

describe('ProfileFormPicture', () => {
  beforeEach(() => {
    vi.stubGlobal('Image', LoadedImage);
    URL.createObjectURL = vi
      .fn()
      .mockReturnValueOnce(FIRST_PREVIEW_URL)
      .mockReturnValueOnce(SECOND_PREVIEW_URL);
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should display the current profile picture when the user has one', async () => {
    // Given / When
    testRender(<ProfileFormPicture onSubmit={vi.fn()} />, {
      me: { picture: CURRENT_PICTURE_URL },
    });

    // Then
    await waitFor(() =>
      expect(getDisplayedPicture()).toHaveAttribute('src', CURRENT_PICTURE_URL)
    );
  });

  it('should open the file picker when the user clicks the edit button', async () => {
    // Given
    const onFilePickerOpened = vi.fn();
    const { user, container } = testRender(
      <ProfileFormPicture onSubmit={vi.fn()} />
    );
    getFileInput(container).addEventListener('click', onFilePickerOpened);

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Edit' }));

    // Then
    expect(onFilePickerOpened).toHaveBeenCalledTimes(1);
  });

  it('should open the file picker when the user clicks the picture', async () => {
    // Given
    const onFilePickerOpened = vi.fn();
    const { user, container } = testRender(
      <ProfileFormPicture onSubmit={vi.fn()} />,
      { me: { picture: CURRENT_PICTURE_URL } }
    );
    getFileInput(container).addEventListener('click', onFilePickerOpened);
    await waitFor(() => expect(getDisplayedPicture()).toBeInTheDocument());

    // When
    await user.click(getDisplayedPicture());

    // Then
    expect(onFilePickerOpened).toHaveBeenCalledTimes(1);
  });

  it('should preview the chosen file instead of the current picture when the user picks a new one', async () => {
    // Given
    const { user, container } = testRender(
      <ProfileFormPicture onSubmit={vi.fn()} />,
      { me: { picture: CURRENT_PICTURE_URL } }
    );

    // When
    await user.upload(getFileInput(container), makeImageFile('first.png'));

    // Then
    await waitFor(() =>
      expect(getDisplayedPicture()).toHaveAttribute('src', FIRST_PREVIEW_URL)
    );
  });

  it('should preview only the latest file when the user picks another one before saving', async () => {
    // Given
    const { user, container } = testRender(
      <ProfileFormPicture onSubmit={vi.fn()} />
    );
    await user.upload(getFileInput(container), makeImageFile('first.png'));

    // When
    await user.upload(getFileInput(container), makeImageFile('second.png'));

    // Then
    await waitFor(() =>
      expect(getDisplayedPicture()).toHaveAttribute('src', SECOND_PREVIEW_URL)
    );
  });

  it('should keep the current picture when the user closes the file picker without choosing a file', async () => {
    // Given
    const { container } = testRender(
      <ProfileFormPicture onSubmit={vi.fn()} />,
      { me: { picture: CURRENT_PICTURE_URL } }
    );

    // When
    fireEvent.change(getFileInput(container), { target: { files: [] } });

    // Then
    await waitFor(() =>
      expect(getDisplayedPicture()).toHaveAttribute('src', CURRENT_PICTURE_URL)
    );
  });

  it('should submit the chosen file and drop the preview when the user clicks update', async () => {
    // Given
    const onSubmit = vi.fn();
    const file = makeImageFile('avatar.png');
    const { user, container } = testRender(
      <ProfileFormPicture onSubmit={onSubmit} />,
      { me: { picture: CURRENT_PICTURE_URL } }
    );
    await user.upload(getFileInput(container), file);

    // When
    await user.click(
      screen.getByRole('button', { name: 'ProfilePage.UpdatePicture' })
    );

    // Then
    expect(onSubmit).toHaveBeenCalledWith([file]);
    await waitFor(() =>
      expect(getDisplayedPicture()).toHaveAttribute('src', CURRENT_PICTURE_URL)
    );
  });

  it('should not submit anything when the user clicks update without choosing a file', async () => {
    // Given
    const onSubmit = vi.fn();
    const { user } = testRender(<ProfileFormPicture onSubmit={onSubmit} />);

    // When
    await user.click(
      screen.getByRole('button', { name: 'ProfilePage.UpdatePicture' })
    );

    // Then
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
