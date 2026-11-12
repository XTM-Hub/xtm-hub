import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UserDisplay } from './UserDisplay';

const uploaderWithPicture = {
  id: 'user-with-picture',
  first_name: 'jane',
  last_name: 'doe',
  email: 'jane@filigran.io',
  picture: 'https://filigran.io/avatar.png',
};

describe('UserDisplay', () => {
  it('renders the uploader full name when available', () => {
    testRender(
      <UserDisplay
        uploader={{
          id: 'user-1',
          first_name: 'jane',
          last_name: 'doe',
          email: 'jane@filigran.io',
          picture: null,
        }}
      />
    );

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('falls back to the uploader email when full name is empty', () => {
    testRender(
      <UserDisplay
        uploader={{
          id: 'user-2',
          first_name: null,
          last_name: null,
          email: 'author@filigran.io',
          picture: null,
        }}
      />
    );

    expect(screen.getByText('author@filigran.io')).toBeInTheDocument();
  });

  it.each`
    uploader
    ${null}
    ${undefined}
  `(
    'renders the "Deleted user" fallback in italic, muted style when uploader is $uploader',
    ({ uploader }) => {
      testRender(<UserDisplay uploader={uploader} />);

      const deletedUserText = screen.getByText('DeletedUser');
      expect(deletedUserText).toBeInTheDocument();
      expect(deletedUserText).toHaveClass('italic', 'text-default-secondary');
    }
  );

  it('does not apply the deleted-user styling when uploader is present', () => {
    testRender(
      <UserDisplay
        uploader={{
          id: 'user-1',
          first_name: 'jane',
          last_name: 'doe',
          email: 'jane@filigran.io',
          picture: null,
        }}
      />
    );

    const nameText = screen.getByText('Jane Doe');
    expect(nameText).not.toHaveClass('italic');
  });

  it('should render the avatar container when displayPicture is true', () => {
    // Given
    const { container } = testRender(
      <UserDisplay
        uploader={uploaderWithPicture}
        displayPicture
      />
    );

    // Then
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('should load the uploader picture in the avatar when displayPicture is true', () => {
    // Given
    const { container } = testRender(
      <UserDisplay
        uploader={uploaderWithPicture}
        displayPicture
      />
    );

    // Then
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      uploaderWithPicture.picture
    );
  });

  it('should load the picture of a backend uploader through its local path', () => {
    // Given
    const userId = '89efc660-a732-4d71-abe2-455188be1505';
    const { container } = testRender(
      <UserDisplay
        uploader={{
          ...uploaderWithPicture,
          picture: `${window.location.origin}/user/picture/${userId}?t=1760000000000`,
        }}
      />
    );

    // Then
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      `/user/picture/${userId}?t=1760000000000`
    );
  });

  it('should size the avatar container with pictureClassName', () => {
    // Given
    const { container } = testRender(
      <UserDisplay
        uploader={uploaderWithPicture}
        pictureClassName="size-6"
      />
    );

    // Then
    expect(container.querySelector('img')?.closest('.size-6')).not.toBeNull();
  });

  it('should not render the avatar container when displayPicture is false', () => {
    // Given
    const { container } = testRender(
      <UserDisplay
        uploader={uploaderWithPicture}
        displayPicture={false}
      />
    );

    // Then
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });
});
