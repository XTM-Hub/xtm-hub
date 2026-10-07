import { FileUpload } from 'graphql-upload/processRequest.mjs';
import { describe, expect, it, vi } from 'vitest';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { MinIOClient } from '../../thirdparty/minio/client';
import { DocumentUploadsHelper, Upload } from './document.uploads.helper';

const upload = (filename: string): Upload => {
  const file = { filename } as FileUpload;
  return { file, promise: Promise.resolve(file) };
};
const serviceInstanceId = 'service-instance' as ServiceInstanceId;

describe('documentUploadsHelper', () => {
  it('should remove the files a batch stored before one of its uploads failed', async () => {
    // Given
    vi.spyOn(MinIOClient, 'createFile').mockImplementation(async (doc) => {
      const { filename } = await (doc as Upload).promise;
      if (filename === 'broken.png') {
        throw new Error('Storage unavailable');
      }
      return {
        minioName: `stored-${filename}`,
        fileName: filename,
        mimeType: 'image/png',
      };
    });
    const deleteFile = vi.spyOn(MinIOClient, 'deleteFile').mockResolvedValue();

    // When
    const call = DocumentUploadsHelper.processUploads(
      [upload('first.png'), upload('broken.png'), upload('third.png')],
      serviceInstanceId
    );

    // Then
    await expect(call).rejects.toThrow('Storage unavailable');
    expect(deleteFile.mock.calls.map(([name]) => name).sort()).toEqual([
      'stored-first.png',
      'stored-third.png',
    ]);
  });

  it('should never fail on a file it cannot remove', async () => {
    // Given
    vi.spyOn(MinIOClient, 'deleteFile').mockRejectedValue(
      new Error('Storage unavailable')
    );

    // When
    const call = DocumentUploadsHelper.removeUploads([
      { minioName: 'stored-file' },
      undefined,
    ]);

    // Then
    await expect(call).resolves.toBeUndefined();
  });
});
