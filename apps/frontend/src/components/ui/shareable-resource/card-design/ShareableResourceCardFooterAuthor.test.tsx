import testRender from '@/utils/test/test-render';
import { DocumentItemFragment } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShareableResourceCardFooterAuthor } from './ShareableResourceCardFooterAuthor';

describe('ShareableResourceCardFooterAuthor', () => {
  const document = {
    id: 'doc-1',
    uploader: { picture: 'https://img', first_name: 'Jane', last_name: 'Doe' },
  };

  it('renders author name and a share button', () => {
    testRender(
      <ShareableResourceCardFooterAuthor
        document={document as DocumentItemFragment}
        shareLinkUrl="https://share.local"
      />
    );

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('loads the author picture in a 24 px avatar', () => {
    const { container } = testRender(
      <ShareableResourceCardFooterAuthor
        document={document as DocumentItemFragment}
        shareLinkUrl="https://share.local"
      />
    );

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://img'
    );
    expect(container.querySelector('img')).toHaveAttribute('width', '24');
    expect(container.querySelector('img')?.closest('div')).toHaveStyle({
      width: '24px',
      height: '24px',
    });
  });

  it('asks Gravatar for a right-sized author picture', () => {
    const gravatarDocument = {
      ...document,
      uploader: {
        ...document.uploader,
        picture: 'https://s.gravatar.com/avatar/538dc0e?s=480&r=pg',
      },
    };

    const { container } = testRender(
      <ShareableResourceCardFooterAuthor
        document={gravatarDocument as DocumentItemFragment}
        shareLinkUrl="https://share.local"
      />
    );

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://s.gravatar.com/avatar/538dc0e?s=48&r=pg'
    );
  });

  it('hides author block when shouldDisplayAuthor is false', () => {
    testRender(
      <ShareableResourceCardFooterAuthor
        document={document as DocumentItemFragment}
        shareLinkUrl="https://share.local"
        shouldDisplayAuthor={false}
        extraContent={<span>extra</span>}
      />
    );

    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
    expect(screen.getByText('extra')).toBeInTheDocument();
  });
});
