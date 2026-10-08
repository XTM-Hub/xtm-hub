import type { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { filterDocumentImages, findDocumentLogo } from './documents';

describe('Documents utils', () => {
  describe('filterDocumentImages', () => {
    it.each`
      title                                      | document                                                                                                                         | expected
      ${'only images'}                           | ${{ children_documents: [{ id: '1', image_type: 'image' }, { id: '2', image_type: 'logo' }, { id: '3', image_type: 'image' }] }} | ${[{ id: '1', image_type: 'image' }, { id: '3', image_type: 'image' }]}
      ${'empty array if no children'}            | ${{}}                                                                                                                            | ${[]}
      ${'empty array if no images'}              | ${{ children_documents: [{ id: '1', image_type: 'logo' }, { id: '2', image_type: 'logo' }] }}                                    | ${[]}
      ${'empty array if null children_document'} | ${{ children_documents: null }}                                                                                                  | ${[]}
    `('should return $title', ({ document, expected }) => {
      const result = filterDocumentImages(
        document as unknown as documentItem_fragment$data
      );
      expect(result).toEqual(expected);
    });
  });

  describe('findDocumentLogo', () => {
    it('should return logo when child has image_type LOGO', () => {
      const document = {
        children_documents: [
          { id: '1', image_type: 'logo' },
          { id: '2', image_type: 'image' },
        ],
      } as unknown as documentItem_fragment$data;
      const result = findDocumentLogo(document);
      expect(result).toStrictEqual({ id: '1', image_type: 'logo' });
    });

    it.each`
      title                                           | document
      ${'undefined if no child with image_type LOGO'} | ${{ children_documents: [{ id: '1', image_type: 'image' }, { id: '2', image_type: 'image' }] }}
      ${'undefined if children_documents is empty'}   | ${{ children_documents: [] }}
      ${'undefined if children_documents is null'}    | ${{ children_documents: null }}
      ${'undefined if children_documents is missing'} | ${{}}
    `('should return $title', ({ document }) => {
      const result = findDocumentLogo(
        document as unknown as documentItem_fragment$data
      );
      expect(result).toBeUndefined();
    });
  });
});
