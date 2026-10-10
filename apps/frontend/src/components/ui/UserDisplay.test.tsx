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
      expect(deletedUserText).toHaveClass(
        'italic',
        'text-text-default-secondary'
      );
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
