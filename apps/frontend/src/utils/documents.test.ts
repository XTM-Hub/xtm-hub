import type { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import {
  type ExistingFile,
  filterDocumentImages,
  findDocumentLogo,
  fromFileSelectValue,
  toFileSelectValue,
} from './documents';

const FIRST_FILE_NAME = 'first.png';
const SECOND_FILE_NAME = 'second.png';
const EXISTING_FILE_ID = 'existing-file-id';
const EXISTING_FILE_NAME = 'existing.png';

const buildFile = (name: string) =>
  new File(['content'], name, { type: 'image/png' });

const firstFile = buildFile(FIRST_FILE_NAME);
const secondFile = buildFile(SECOND_FILE_NAME);
const existingFile: ExistingFile = {
  id: EXISTING_FILE_ID,
  file_name: EXISTING_FILE_NAME,
};
const fileList = { 0: firstFile, 1: secondFile, length: 2 };

// jsdom `File`s have no own enumerable keys, so `toEqual` would match any two
const expectSameFiles = (result: unknown, expected: File[]) => {
  expect(result).toHaveLength(expected.length);
  expected.forEach((file, index) =>
    expect((result as File[])[index]).toBe(file)
  );
};

const EMPTY_FORM_VALUES: [string, unknown][] = [
  ['undefined', undefined],
  ['null', null],
  ['an empty string', ''],
  ['an empty array', []],
];

describe('Documents utils', () => {
  describe('toFileSelectValue', () => {
    it.each`
      context                      | formValue                                | expected
      ${'a FileList'}              | ${fileList}                              | ${firstFile}
      ${'existing then new files'} | ${[existingFile, secondFile, firstFile]} | ${secondFile}
    `(
      'should return the first new file when the form value is $context in single mode',
      ({ formValue, expected }) => {
        // Given the form value

        // When
        const result = toFileSelectValue(formValue);

        // Then
        expect(result).toBe(expected);
      }
    );

    it.each`
      context                     | formValue                                              | expected
      ${'a FileList'}             | ${fileList}                                            | ${[firstFile, secondFile]}
      ${'existing and new files'} | ${[existingFile, secondFile, existingFile, firstFile]} | ${[secondFile, firstFile]}
    `(
      'should return the new files in order when the form value is $context in multiple mode',
      ({ formValue, expected }) => {
        // Given the form value

        // When
        const result = toFileSelectValue(formValue, true);

        // Then
        expectSameFiles(result, expected);
      }
    );

    it('should return null when the form value only holds existing files', () => {
      // Given
      const formValue = [existingFile];

      // When
      const result = toFileSelectValue(formValue);

      // Then
      expect(result).toBeNull();
    });

    it.each(EMPTY_FORM_VALUES)(
      'should return null when the form value is %s in single mode',
      (_context, formValue) => {
        // Given the empty form value

        // When
        const result = toFileSelectValue(formValue);

        // Then
        expect(result).toBeNull();
      }
    );

    it.each(EMPTY_FORM_VALUES)(
      'should return an empty array when the form value is %s in multiple mode',
      (_context, formValue) => {
        // Given the empty form value

        // When
        const result = toFileSelectValue(formValue, true);

        // Then
        expect(result).toEqual([]);
      }
    );
  });

  describe('fromFileSelectValue', () => {
    it.each`
      context            | next                       | expected
      ${'a single file'} | ${secondFile}              | ${[secondFile]}
      ${'several files'} | ${[secondFile, firstFile]} | ${[secondFile, firstFile]}
    `(
      'should return the files as an array in order when the selection is $context',
      ({ next, expected }) => {
        // Given the selection

        // When
        const result = fromFileSelectValue(next);

        // Then
        expectSameFiles(result, expected);
      }
    );

    it.each<[string, File[] | null]>([
      ['null', null],
      ['an empty array', []],
    ])('should return undefined when the selection is %s', (_context, next) => {
      // Given the empty selection

      // When
      const result = fromFileSelectValue(next);

      // Then
      expect(result).toBeUndefined();
    });
  });

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
