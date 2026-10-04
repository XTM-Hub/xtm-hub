import { FileUpload } from 'graphql-upload/processRequest.mjs';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { MinIOClient } from '../../thirdparty/minio/client';
import { logApp } from '../../utils/app-logger.util';

export interface Upload {
  file: FileUpload;
  promise: Promise<FileUpload>;
}

export const DocumentUploadsHelper = {
  waitForUploads: async (uploads: Upload[] | Upload) => {
    const uploadList = Array.isArray(uploads) ? uploads : [uploads];
    await Promise.all(uploadList.map((upload) => upload.promise));
  },

  processUploads: async (
    uploads: Upload[] | Upload | undefined | null,
    serviceInstanceId: ServiceInstanceId
  ) => {
    if (uploads === undefined || uploads === null) {
      return [];
    }

    const uploadList = Array.isArray(uploads) ? uploads : [uploads];
    await DocumentUploadsHelper.waitForUploads(uploadList);

    // A batch that fails part-way removes the files it stored before failing
    const results = await Promise.allSettled(
      uploadList.map((doc) => MinIOClient.createFile(doc, serviceInstanceId))
    );
    const stored = results.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : []
    );
    const failure = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected'
    );
    if (failure) {
      await DocumentUploadsHelper.removeUploads(stored);
      throw failure.reason;
    }
    return stored;
  },

  /**
   * Removes stored uploads that no document references, for a creation that
   * failed after uploading them. Never throws: the creation error is the one
   * the caller reports.
   */
  removeUploads: async (
    files: ReadonlyArray<{ minioName: string } | undefined>
  ) => {
    const minioNames = files.flatMap((file) => (file ? [file.minioName] : []));
    const results = await Promise.allSettled(
      minioNames.map((minioName) => MinIOClient.deleteFile(minioName))
    );
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logApp.warn('[FILE STORAGE] Unable to remove an unused upload', {
          key: minioNames[index],
          error: result.reason,
        });
      }
    });
  },
};
