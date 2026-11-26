import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UserDisplay } from './UserDisplay';

const uploaderWithPicture = {
  id: 'user-with-picture',
  first_name: 'jane',
  last_name: 'doe',
  email: 'jane@example.test',
  picture: 'https://example.test/avatar.png',
};

describe('UserDisplay', () => {
  it('renders the uploader full name when available', () => {
    testRender(
      <UserDisplay
        uploader={{
          id: 'user-1',
          first_name: 'jane',
          last_name: 'doe',
          email: 'jane@example.test',
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
          email: 'author@example.test',
          picture: null,
        }}
      />
    );

    expect(screen.getByText('author@example.test')).toBeInTheDocument();
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
          email: 'jane@example.test',
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

  it('should ask Gravatar for a picture of twice the displayed size', () => {
    // Given
    const { container } = testRender(
      <UserDisplay
        uploader={{
          ...uploaderWithPicture,
          picture: 'https://s.gravatar.com/avatar/538dc0e?s=480&r=pg',
        }}
        pictureSize={24}
      />
    );

    // Then
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://s.gravatar.com/avatar/538dc0e?s=48&r=pg'
    );
  });

  it('should serve a backend picture through the Next image optimiser at the displayed size', () => {
    // Given
    const userId = '89efc660-a732-4d71-abe2-455188be1505';
    const stored = `https://hub.example.test/user/picture/${userId}?t=1760000000000`;
    const { container } = testRender(
      <UserDisplay
        uploader={{ ...uploaderWithPicture, picture: stored }}
        pictureSize={24}
      />
    );

    // Then
    const image = container.querySelector('img');
    const localPath = encodeURIComponent(`/user/picture/${userId}`);
    expect(image?.getAttribute('srcset')).toBe(
      `/_next/image?url=${localPath}&w=32&q=75 1x, /_next/image?url=${localPath}&w=48&q=75 2x`
    );
    expect(image).toHaveAttribute('src', expect.not.stringContaining('t%3D'));
  });

  it('should size the avatar container and the image with pictureSize', () => {
    // Given
    const { container } = testRender(
      <UserDisplay
        uploader={uploaderWithPicture}
        pictureSize={24}
      />
    );

    // Then
    const image = container.querySelector('img');
    expect(image).toHaveAttribute('width', '24');
    expect(image?.closest('div')).toHaveStyle({
      width: '24px',
      height: '24px',
    });
  });

  it('should size the avatar for 32 px by default', () => {
    // Given
    const { container } = testRender(
      <UserDisplay uploader={uploaderWithPicture} />
    );

    // Then
    const image = container.querySelector('img');
    expect(image).toHaveAttribute('width', '32');
    expect(image?.closest('div')).toHaveStyle({
      width: '32px',
      height: '32px',
    });
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
