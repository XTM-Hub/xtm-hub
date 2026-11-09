import { FileUpload } from 'graphql-upload/processRequest.mjs';
import { Readable } from 'stream';
import DocumentModel from '../../model/kanel/public/Document';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { MinIOClient } from '../../thirdparty/minio/client';
import { logApp } from '../../utils/app-logger.util';
import { toError } from '../../utils/error/error-guard.util';
import { streamToSha256 } from '../../utils/process-upload-file';

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

    return Promise.all(
      uploadList.map((doc) => MinIOClient.createFile(doc, serviceInstanceId))
    );
  },

  /**
   * Whether `upload` holds the same file as the stored one: same mime type and
   * same content, compared by SHA-256. A stored file missing from storage or
   * that cannot be read never matches, so the caller uploads it again: this
   * comparison only saves an upload and must never fail the caller.
   */
  hasSameContent: async (
    upload: Upload,
    storedFile: Pick<DocumentModel, 'minio_name' | 'mime_type'>
  ): Promise<boolean> => {
    const { minio_name, mime_type } = storedFile;
    const file = await upload.promise;
    if (!minio_name || mime_type !== file.mimetype) {
      return false;
    }

    try {
      const storedContent = await MinIOClient.downloadFile(minio_name);
      if (!storedContent) {
        return false;
      }

      const storedHash = await streamToSha256(storedContent as Readable);
      const uploadHash = await streamToSha256(file.createReadStream());
      return storedHash === uploadHash;
    } catch (error) {
      logApp.warn('[FILE STORAGE] Cannot compare with the stored file', {
        key: minio_name,
        error: toError(error),
      });
      return false;
    }
  },
};
