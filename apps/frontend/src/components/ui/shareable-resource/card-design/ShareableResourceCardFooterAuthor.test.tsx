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
