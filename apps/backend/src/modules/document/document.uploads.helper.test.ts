import { afterEach, describe, expect, it, vi } from 'vitest';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { MinIOClient } from '../../thirdparty/minio/client';
import { MinioFile } from '../../thirdparty/minio/types';
import { DocumentUploadsHelper, Upload } from './document.uploads.helper';

const serviceInstanceId = 'service-instance' as ServiceInstanceId;

const upload = (filename: string) =>
  ({
    file: { filename },
    promise: Promise.resolve({ filename }),
  }) as unknown as Upload;

const storedFile = (minioName: string): MinioFile => ({
  minioName,
  fileName: minioName,
  mimeType: 'image/png',
});

describe('documentUploadsHelper', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('removes the files already stored when another upload of the request fails', async () => {
    vi.spyOn(MinIOClient, 'createFile').mockImplementation(async (doc) => {
      if (doc.file.filename === 'broken.png') {
        throw new Error('STORAGE_ERROR');
      }
      return storedFile(doc.file.filename);
    });
    const deleteFile = vi
      .spyOn(MinIOClient, 'deleteFile')
      .mockResolvedValue(undefined);

    const call = DocumentUploadsHelper.processUploads(
      [upload('first.png'), upload('broken.png')],
      serviceInstanceId
    );

    await expect(call).rejects.toThrow('STORAGE_ERROR');
    expect(deleteFile).toHaveBeenCalledExactlyOnceWith('first.png');
  });

  it('removes every file stored by a request that fails afterwards', async () => {
    vi.spyOn(MinIOClient, 'createFile').mockImplementation(async (doc) =>
      storedFile(doc.file.filename)
    );
    const deleteFile = vi
      .spyOn(MinIOClient, 'deleteFile')
      .mockResolvedValue(undefined);

    const call = DocumentUploadsHelper.withUploadsCleanup(
      serviceInstanceId,
      async (storeUploads) => {
        await storeUploads(upload('pack.json'));
        await storeUploads([upload('image.png')]);
        throw new Error('SLUG_TAKEN');
      }
    );

    await expect(call).rejects.toThrow('SLUG_TAKEN');
    expect(deleteFile.mock.calls.map(([name]) => name).sort()).toEqual([
      'image.png',
      'pack.json',
    ]);
  });

  it('keeps the stored files of a request that succeeds', async () => {
    vi.spyOn(MinIOClient, 'createFile').mockImplementation(async (doc) =>
      storedFile(doc.file.filename)
    );
    const deleteFile = vi.spyOn(MinIOClient, 'deleteFile');

    const result = await DocumentUploadsHelper.withUploadsCleanup(
      serviceInstanceId,
      async (storeUploads) => storeUploads(upload('pack.json'))
    );

    expect(result).toEqual([storedFile('pack.json')]);
    expect(deleteFile).not.toHaveBeenCalled();
  });

  it('removes the file a committed update replaced', async () => {
    const deleteFile = vi
      .spyOn(MinIOClient, 'deleteFile')
      .mockResolvedValue(undefined);

    await DocumentUploadsHelper.deleteReplacedFile(
      'previous.json',
      'replacement.json'
    );

    expect(deleteFile).toHaveBeenCalledExactlyOnceWith('previous.json');
  });

  it.each`
    case                                 | previous       | current
    ${'the update kept the same file'}   | ${'pack.json'} | ${'pack.json'}
    ${'the document had no file before'} | ${null}        | ${'pack.json'}
  `('keeps every file when $case', async ({ previous, current }) => {
    const deleteFile = vi.spyOn(MinIOClient, 'deleteFile');

    await DocumentUploadsHelper.deleteReplacedFile(previous, current);

    expect(deleteFile).not.toHaveBeenCalled();
  });

  it('does not fail a committed update when the replaced file cannot be removed', async () => {
    vi.spyOn(MinIOClient, 'deleteFile').mockRejectedValue(
      new Error('STORAGE_UNAVAILABLE')
    );

    await expect(
      DocumentUploadsHelper.deleteReplacedFile(
        'previous.json',
        'replacement.json'
      )
    ).resolves.toBeUndefined();
  });
});
