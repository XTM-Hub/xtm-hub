import { FileUpload } from 'graphql-upload/processRequest.mjs';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { MinIOClient } from '../../thirdparty/minio/client';
import { MinioFile, UploadRules } from '../../thirdparty/minio/types';
import { logApp } from '../../utils/app-logger.util';
import { getErrorMessage } from '../../utils/error/error-guard.util';

export interface Upload {
  file: FileUpload;
  promise: Promise<FileUpload>;
}

type StoreUploads = (
  uploads: Upload[] | Upload | undefined | null,
  rules?: UploadRules
) => Promise<MinioFile[]>;

export const DocumentUploadsHelper = {
  waitForUploads: async (uploads: Upload[] | Upload) => {
    const uploadList = Array.isArray(uploads) ? uploads : [uploads];
    await Promise.all(uploadList.map((upload) => upload.promise));
  },

  processUploads: async (
    uploads: Upload[] | Upload | undefined | null,
    serviceInstanceId: ServiceInstanceId,
    rules?: UploadRules
  ): Promise<MinioFile[]> => {
    if (uploads === undefined || uploads === null) {
      return [];
    }

    const uploadList = Array.isArray(uploads) ? uploads : [uploads];
    await DocumentUploadsHelper.waitForUploads(uploadList);

    const results = await Promise.allSettled(
      uploadList.map((doc) =>
        MinIOClient.createFile(doc, serviceInstanceId, rules)
      )
    );
    const rejected = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected'
    );
    const stored = results
      .filter(
        (result): result is PromiseFulfilledResult<MinioFile> =>
          result.status === 'fulfilled'
      )
      .map((result) => result.value);
    if (rejected) {
      await DocumentUploadsHelper.deleteStoredFiles(stored);
      throw rejected.reason;
    }
    return stored;
  },

  /** Best-effort removal of the files a failed request stored. */
  deleteStoredFiles: async (files: MinioFile[]) => {
    await Promise.all(
      files.map(async (file) => {
        try {
          await MinIOClient.deleteFile(file.minioName);
        } catch (error) {
          logApp.error(
            '[DOCUMENT] Unable to delete a file of a failed request',
            {
              minioName: file.minioName,
              error: getErrorMessage(error),
            }
          );
        }
      })
    );
  },

  /**
   * Runs a request with an uploader that records every stored file, and
   * removes them all when the request fails, so it leaves no file behind.
   */
  withUploadsCleanup: async <T>(
    serviceInstanceId: ServiceInstanceId,
    work: (storeUploads: StoreUploads) => Promise<T>
  ): Promise<T> => {
    const storedFiles: MinioFile[] = [];
    try {
      return await work(async (uploads, rules) => {
        const files = await DocumentUploadsHelper.processUploads(
          uploads,
          serviceInstanceId,
          rules
        );
        storedFiles.push(...files);
        return files;
      });
    } catch (error) {
      await DocumentUploadsHelper.deleteStoredFiles(storedFiles);
      throw error;
    }
  },
};
