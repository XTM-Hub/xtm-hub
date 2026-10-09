import testRender from '@/utils/test/test-render';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { describe, expect, it } from 'vitest';
import { DocumentShortDescriptionCell } from './DocumentListCells';

describe('DocumentShortDescriptionCell', () => {
  it.each`
    shortDescription
    ${null}
    ${undefined}
    ${''}
  `(
    'renders nothing when short_description is "$shortDescription"',
    ({ shortDescription }) => {
      const document = {
        short_description: shortDescription,
      } as unknown as documentItem_fragment$data;

      const { container } = testRender(
        <DocumentShortDescriptionCell document={document} />
      );

      expect(container.firstChild).toBeNull();
    }
  );

  it('renders short description text', () => {
    const document = {
      short_description: 'A concise summary',
    } as unknown as documentItem_fragment$data;

    const { getByText } = testRender(
      <DocumentShortDescriptionCell document={document} />
    );

    expect(getByText('A concise summary')).toBeInTheDocument();
  });
});
