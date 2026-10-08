import type { useTranslate } from '@/hooks/use-translate';
import {
  fromFileSelectValue,
  getFileSelectLabels,
  toFileSelectValue,
} from '@/utils/design-system/file-select';
import type { ExistingFile } from '@/utils/documents';
import { describe, expect, it } from 'vitest';

const t = ((key: string, values?: Record<string, string | number>) =>
  values
    ? `${key}:${Object.values(values).join(',')}`
    : key) as unknown as ReturnType<typeof useTranslate>;

const buildFile = (name: string) => new File(['content'], name);

const FIRST_FILE_NAME = 'first.png';
const SECOND_FILE_NAME = 'second.png';
const EXISTING_FILE_ID = 'existing-file-id';
const EXISTING_FILE_NAME = 'existing.png';

const buildImageFile = (name: string) =>
  new File(['content'], name, { type: 'image/png' });

const firstFile = buildImageFile(FIRST_FILE_NAME);
const secondFile = buildImageFile(SECOND_FILE_NAME);
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

describe('getFileSelectLabels', () => {
  it('should name the trigger, the empty field, the loading state and the clear control with their translation', () => {
    // Given / When
    const result = getFileSelectLabels(t);

    // Then
    expect(result).toMatchObject({
      triggerLabel: 'DesignSystem.FileSelect.Trigger',
      placeholder: 'DesignSystem.FileSelect.Placeholder',
      loadingLabel: 'DesignSystem.FileSelect.Loading',
      clearLabel: 'DesignSystem.FileSelect.Clear',
    });
  });

  it('should name the remove control of a file after the file', () => {
    // Given
    const { removeFileLabel } = getFileSelectLabels(t);

    // When
    const result = removeFileLabel?.('logo.png');

    // Then
    expect(result).toBe('DesignSystem.FileSelect.RemoveFile:logo.png');
  });

  it.each([{ reason: 'accept' as const }, { reason: 'maxSize' as const }])(
    'should name the file and the $reason reason when one file is rejected',
    ({ reason }) => {
      // Given
      const { rejectionMessage } = getFileSelectLabels(t);

      // When
      const result = rejectionMessage?.([
        { file: buildFile('notes.txt'), reason },
      ]);

      // Then
      expect(result).toBe(
        `DesignSystem.FileSelect.FileRejected:notes.txt,${reason}`
      );
    }
  );

  it('should count the files when several files are rejected', () => {
    // Given
    const { rejectionMessage } = getFileSelectLabels(t);

    // When
    const result = rejectionMessage?.([
      { file: buildFile('notes.txt'), reason: 'accept' },
      { file: buildFile('huge.png'), reason: 'maxSize' },
    ]);

    // Then
    expect(result).toBe('DesignSystem.FileSelect.FilesRejected:2');
  });
});
