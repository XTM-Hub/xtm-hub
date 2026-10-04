import { Readable } from 'stream';

export interface UploadedFile {
  createReadStream: () => Readable;
  filename: string;
  mimetype: string;
  encoding: string;
}

/** A size above which an upload is refused, with the error code to raise. */
export interface UploadLimit {
  maxBytes: number;
  errorCode: string;
}

export interface MinioFile {
  minioName: string;
  fileName: string;
  mimeType: string;
  jsonContent?: Record<string, unknown>;
}
