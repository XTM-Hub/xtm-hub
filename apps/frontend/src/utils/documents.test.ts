import type { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { DocumentImageType } from '@graphql/generated';
import {
  docIsExistingFile,
  filterDocumentImages,
  findDocumentLogo,
  FormImagesValues,
  splitExistingAndNewImages,
  transformToFileList,
} from './documents';

const EXISTING_IMAGE_ID = 'existing-image-id';
const EXISTING_FILE_NAME = 'existing.png';
const NEW_FILE_NAME = 'new.png';
const NEW_FILE_PREVIEW = 'data:image/png;base64,AAAA';

const makeExistingImage = () => ({
  id: EXISTING_IMAGE_ID,
  file_name: EXISTING_FILE_NAME,
});

const makeNewImage = () =>
  Object.assign(new File(['content'], NEW_FILE_NAME, { type: 'image/png' }), {
    preview: NEW_FILE_PREVIEW,
  });

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

  describe('docIsExistingFile', () => {
    it('should recognise an already uploaded file', () => {
      // Given
      const image = makeExistingImage();

      // When
      const result = docIsExistingFile(image);

      // Then
      expect(result).toBe(true);
    });

    it.each([
      ['a new file', makeNewImage()],
      ['an object without file name', { id: EXISTING_IMAGE_ID }],
      ['null', null],
      ['undefined', undefined],
      ['a string', EXISTING_FILE_NAME],
    ])('should not take %s for an uploaded file', (_label, value) => {
      // Given / When
      const result = docIsExistingFile(value);

      // Then
      expect(result).toBe(false);
    });
  });

  describe('splitExistingAndNewImages', () => {
    it('should keep the ids of the existing images apart from the new files', () => {
      // Given
      const newImage = makeNewImage();
      const images = [makeExistingImage(), newImage];

      // When
      const [existingIds, newImages] = splitExistingAndNewImages(images);

      // Then
      expect({ existingIds, newImages }).toEqual({
        existingIds: [EXISTING_IMAGE_ID],
        newImages: [newImage],
      });
    });

    it('should not send the preview of a new image to the server', () => {
      // Given
      const images = [makeNewImage()];

      // When
      const [, [newImage]] = splitExistingAndNewImages(images);

      // Then
      expect(newImage).not.toHaveProperty('preview');
    });

    it('should return no image when there is none', () => {
      // Given
      const images: FormImagesValues = [];

      // When
      const result = splitExistingAndNewImages(images);

      // Then
      expect(result).toEqual([[], []]);
    });
  });

  describe('transformToFileList', () => {
    const LOGO = { id: 'logo-id', image_type: DocumentImageType.Logo };
    const IMAGE = { id: 'image-id', image_type: DocumentImageType.Image };

    it.each([
      [
        'logos',
        'mixed children',
        DocumentImageType.Logo,
        { children_documents: [LOGO, IMAGE] },
        [LOGO],
      ],
      [
        'images',
        'mixed children',
        DocumentImageType.Image,
        { children_documents: [LOGO, IMAGE] },
        [IMAGE],
      ],
      [
        'no image',
        'only a logo',
        DocumentImageType.Image,
        { children_documents: [LOGO] },
        [],
      ],
      [
        'no image',
        'no children',
        DocumentImageType.Image,
        { children_documents: null },
        [],
      ],
      ['no image', 'no document', DocumentImageType.Image, undefined, []],
    ])(
      'should keep %s when the document has %s',
      (_kept, _context, imageType, document, expected) => {
        // Given / When
        const result = transformToFileList(
          imageType,
          document as unknown as documentItem_fragment$data
        );

        // Then
        expect(result).toEqual(expected);
      }
    );
  });
});
