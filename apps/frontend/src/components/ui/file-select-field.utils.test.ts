import { getFileSelectLabels } from '@/components/ui/file-select-field.utils';
import type { useTranslate } from '@/hooks/use-translate';
import { describe, expect, it } from 'vitest';

const t = ((key: string, values?: Record<string, string | number>) =>
  values
    ? `${key}:${Object.values(values).join(',')}`
    : key) as unknown as ReturnType<typeof useTranslate>;

const buildFile = (name: string) => new File(['content'], name);

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
