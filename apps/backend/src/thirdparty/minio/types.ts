import { Readable } from 'stream';

export interface UploadedFile {
  createReadStream: () => Readable;
  filename: string;
  mimetype: string;
  encoding: string;
}

/** How the file of a library is received. */
export interface UploadRules {
  /** Refused above this size, with the error code to raise. */
  limit?: { maxBytes: number; errorCode: string };
  /** Read as JSON whatever media type the browser declared. */
  json?: boolean;
}

export interface MinioFile {
  minioName: string;
  fileName: string;
  mimeType: string;
  jsonContent?: Record<string, unknown>;
}
