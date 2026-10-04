import * as s3 from '@aws-sdk/client-s3';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Upload as S3Upload } from '@aws-sdk/lib-storage';
import config from 'config';
import Stream from 'node:stream';
import { requestContext } from '../../context/request.context';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { DocumentHelper } from '../../modules/document/document.helper';
import { Upload } from '../../modules/document/document.uploads.helper';
import { logApp } from '../../utils/app-logger.util';
import { getErrorMessage, toError } from '../../utils/error/error-guard.util';
import {
  isObjectNotFoundError,
  StorageUnavailableError,
} from './storage-error';
import { MinioFile, UploadedFile, UploadRules } from './types';

const getEndpoint = () => {
  // If using AWS S3, unset the endpoint to let the library choose the best endpoint
  if (config.get('minio.endpoint') === 's3.amazonaws.com') {
    return undefined;
  }
  return `${config.get('minio.useSsl') === 'true' ? 'https' : 'http'}://${config.get('minio.endpoint')}:${config.get('minio.port')}`;
};

const s3Client = new S3Client({
  region: config.get('minio.region'),
  endpoint: getEndpoint(),
  forcePathStyle: true,
  credentials: {
    accessKeyId: config.get('minio.accessKeyId'),
    secretAccessKey: config.get('minio.secretAccessKey'),
  },
  tls: config.get('minio.useSsl') === 'true' ? true : false,
});

export const MinIOClient = {
  initializeBucket: async (): Promise<boolean> => {
    try {
      // Try to access to the bucket
      await s3Client.send(
        new HeadBucketCommand({ Bucket: config.get('minio.bucketName') })
      );
      return true;
    } catch (err) {
      // If bucket not exist, try to create it.
      // If creation fail, propagate the exception

      logApp.error(toError(err));
      await s3Client.send(
        new CreateBucketCommand({ Bucket: config.get('minio.bucketName') })
      );
      return true;
    }
  },

  createFile: async (
    jsonFile: Upload,
    serviceInstanceId: ServiceInstanceId,
    rules?: UploadRules
  ): Promise<MinioFile> => {
    const user = requestContext.requireUser();
    const fileName = DocumentHelper.normalizeDocumentName(
      jsonFile.file.filename
    );
    const { minioName, jsonContent } = await MinIOClient.sendFile(
      jsonFile.file,
      fileName,
      user.id,
      serviceInstanceId,
      rules
    );

    return {
      minioName,
      fileName,
      mimeType: rules?.json ? JSON_MIME_TYPE : jsonFile.file.mimetype,
      jsonContent,
    };
  },

  insertFile: async (fileParams: {
    Bucket: string;
    Key: string;
    Body: string | Stream.Readable;
    Metadata: {
      mimetype: string;
      filename: string;
      encoding: string;
      Uploadinguserid: string;
      ServiceInstanceId: string;
    };
  }) => {
    const fileKey: string = fileParams.Key;
    const s3Upload = new S3Upload({
      client: s3Client,
      params: fileParams,
    });
    await s3Upload.done();
    logApp.debug('[MinIO] inserted file', { key: fileParams.Key });
    return fileKey;
  },

  sendFile: async (
    file: UploadedFile,
    filename: string,
    userId: string,
    serviceInstanceId: ServiceInstanceId,
    rules?: UploadRules
  ): Promise<{ minioName: string; jsonContent?: Record<string, unknown> }> => {
    const fullMetadata = {
      mimetype: rules?.json ? JSON_MIME_TYPE : file.mimetype,
      filename,
      encoding: file.encoding,
      Uploadinguserid: userId,
      ServiceInstanceId: serviceInstanceId,
    };

    const stream = rules?.limit
      ? limitStreamSize(file.createReadStream(), rules.limit)
      : file.createReadStream();

    const jsonContent =
      rules?.json || isJsonMimeType(file.mimetype)
        ? await parseJsonStream(stream)
        : undefined;

    const fileParams = {
      Bucket: config.get<string>('minio.bucketName'),
      Key: DocumentHelper.getDocumentName(file.filename),
      // Need to pass jsonContent because a stream can't be read twice
      Body: jsonContent ? JSON.stringify(jsonContent) : stream,
      Metadata: fullMetadata,
    };

    const minioName = await MinIOClient.insertFile(fileParams);
    return {
      minioName,
      jsonContent,
    };
  },

  uploadFile: async (
    file: UploadedFile,
    key: string,
    userId: string,
    fileName: string
  ): Promise<string> => {
    const fileParams = {
      Bucket: config.get<string>('minio.bucketName'),
      Key: key,
      Body: file.createReadStream(),
      Metadata: {
        mimetype: file.mimetype,
        filename: fileName,
        encoding: file.encoding,
        Uploadinguserid: userId,
        ServiceInstanceId: 'none',
      },
    };

    return MinIOClient.insertFile(fileParams);
  },

  downloadFile: async (minioName: string) => {
    try {
      const object = await s3Client.send(
        new s3.GetObjectCommand({
          Bucket: config.get('minio.bucketName'),
          Key: minioName,
        })
      );
      return object.Body;
    } catch (err) {
      if (isObjectNotFoundError(err)) {
        logApp.info('[FILE STORAGE] Object not found in S3', {
          key: minioName,
        });
        return null;
      }
      logApp.error('[FILE STORAGE] Cannot retrieve file from S3', {
        key: minioName,
        error: getErrorMessage(err),
      });
      throw new StorageUnavailableError(
        `Cannot retrieve ${minioName} from storage`,
        { cause: err }
      );
    }
  },

  deleteFile: async (minioName: string) => {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: config.get('minio.bucketName'),
      Key: minioName,
    });
    await s3Client.send(deleteCommand);
  },
};

const JSON_MIME_TYPE = 'application/json';

// A JSON media type may carry parameters, such as its charset
const isJsonMimeType = (mimetype: string) =>
  mimetype.split(';')[0]?.trim().toLowerCase() === JSON_MIME_TYPE;

// Refuses an upload above its limit while it streams, before it is buffered or stored.
const limitStreamSize = (
  stream: Stream.Readable,
  limit: NonNullable<UploadRules['limit']>
): Stream.Readable => {
  let size = 0;
  const limited = new Stream.Transform({
    transform(chunk: Buffer, _encoding, callback) {
      size += chunk.length;
      callback(
        size > limit.maxBytes ? new Error(limit.errorCode) : null,
        chunk
      );
    },
  });
  stream.on('error', (error) => limited.destroy(error));
  return stream.pipe(limited);
};

const readStreamText = async (stream: Stream.Readable): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
};

const parseJsonStream = async (
  stream: Stream.Readable
): Promise<Record<string, unknown> | undefined> => {
  const content = await readStreamText(stream);
  try {
    return JSON.parse(content);
  } catch (err) {
    logApp.error(`unable to parse JSON stream: ${getErrorMessage(err)}`);
    return undefined;
  }
};
