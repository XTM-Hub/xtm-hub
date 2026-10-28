import type { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { DocumentImageType, DocumentSourceType } from '@graphql/generated';
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
const CREATED_AT = '2025-01-01T00:00:00.000Z';

const makeChild = (id: string, imageType: DocumentImageType) => ({
  active: true,
  created_at: CREATED_AT,
  description: null,
  download_number: null,
  file_name: `${id}.png`,
  id,
  image_type: imageType,
  name: null,
  source_type: DocumentSourceType.Internal,
});

const makeDocument = (
  children: documentItem_fragment$data['children_documents']
): documentItem_fragment$data => ({
  __typename: 'Document',
  active: true,
  children_documents: children,
  created_at: CREATED_AT,
  description: null,
  download_number: null,
  file_name: null,
  id: 'document-id',
  name: null,
  service_instance: null,
  share_number: null,
  short_description: null,
  slug: null,
  subscription: null,
  type: 'document',
  updated_at: null,
  uploader: null,
  uploader_organization: null,
  use_cases: null,
  ' $fragmentType': 'documentItem_fragment',
});

const LOGO = makeChild('logo-id', DocumentImageType.Logo);
const IMAGE = makeChild('image-id', DocumentImageType.Image);
const OTHER_IMAGE = makeChild('other-image-id', DocumentImageType.Image);

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
      title                                      | children                      | expected
      ${'only images'}                           | ${[IMAGE, LOGO, OTHER_IMAGE]} | ${[IMAGE, OTHER_IMAGE]}
      ${'empty array if no children'}            | ${undefined}                  | ${[]}
      ${'empty array if no images'}              | ${[LOGO]}                     | ${[]}
      ${'empty array if null children_document'} | ${null}                       | ${[]}
    `('should return $title', ({ children, expected }) => {
      const result = filterDocumentImages(makeDocument(children));
      expect(result).toEqual(expected);
    });
  });

  describe('findDocumentLogo', () => {
    it('should return logo when child has image_type LOGO', () => {
      const document = makeDocument([LOGO, IMAGE]);
      const result = findDocumentLogo(document);
      expect(result).toStrictEqual(LOGO);
    });

    it.each`
      title                                           | children
      ${'undefined if no child with image_type LOGO'} | ${[IMAGE, OTHER_IMAGE]}
      ${'undefined if children_documents is empty'}   | ${[]}
      ${'undefined if children_documents is null'}    | ${null}
      ${'undefined if children_documents is missing'} | ${undefined}
    `('should return $title', ({ children }) => {
      const result = findDocumentLogo(makeDocument(children));
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

    it('should strip the preview in place from the new image held by the form', () => {
      // Given
      const newImage = makeNewImage();

      // When
      splitExistingAndNewImages([newImage]);

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
    it.each([
      [
        'the logo of a document with mixed children',
        DocumentImageType.Logo,
        [LOGO, IMAGE],
        [LOGO],
      ],
      [
        'the images of a document with mixed children',
        DocumentImageType.Image,
        [LOGO, IMAGE],
        [IMAGE],
      ],
      [
        'no image of a document with only a logo',
        DocumentImageType.Image,
        [LOGO],
        [],
      ],
      [
        'no image of a document without children',
        DocumentImageType.Image,
        null,
        [],
      ],
    ])('should keep %s', (_context, imageType, children, expected) => {
      // Given
      const document = makeDocument(children);

      // When
      const result = transformToFileList(imageType, document);

      // Then
      expect(result).toEqual(expected);
    });

    it('should keep no image when there is no document', () => {
      // Given / When
      const result = transformToFileList(DocumentImageType.Image);

      // Then
      expect(result).toEqual([]);
    });
  });
});
