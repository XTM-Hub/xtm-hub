import { createHash } from 'crypto';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';

type UploadLike = Promise<{
  createReadStream: () => Readable;
  filename: string;
  mimetype: string;
}>;

const storeUpload = async ({
  stream,
  filename,
}: {
  stream: Readable;
  filename: string;
}): Promise<{ path: string | Buffer }> => {
  const uploadDir = './uploads';
  const path = join(uploadDir, filename);
  return new Promise((resolve, reject) =>
    stream
      .pipe(createWriteStream(path))
      .on('finish', () => resolve({ path }))
      .on('error', reject)
  );
};

export const processUploadFile = async (upload: UploadLike) => {
  const { createReadStream, filename, mimetype } = await upload;
  const stream = createReadStream();
  const { path } = await storeUpload({ stream, filename });
  return { filename, mimetype, path };
};

export const processStreamFile = async (upload: UploadLike) => {
  const { createReadStream } = await upload;
  return createReadStream();
};

export const streamToBlob = (
  stream: Readable,
  mimeType?: string
): Promise<Blob> => {
  if (mimeType != null && typeof mimeType !== 'string') {
    throw new Error('Invalid mimetype, expected string.');
  }
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream
      .on('data', (chunk: Uint8Array) => chunks.push(new Uint8Array(chunk)))
      .once('end', () => {
        const blob =
          mimeType != null
            ? new Blob(chunks, { type: mimeType })
            : new Blob(chunks);
        resolve(blob);
      })
      .once('error', reject);
  });
};

export const streamToBase64 = (stream: Readable): Promise<string> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream
      .on('data', (chunk: Buffer) => chunks.push(chunk))
      .once('end', () => resolve(Buffer.concat(chunks).toString('base64')))
      .once('error', reject);
  });
};

export const streamToSha256 = (stream: Readable): Promise<string> => {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    stream
      .on('data', (chunk: Buffer) => hash.update(chunk))
      .once('end', () => resolve(hash.digest('hex')))
      .once('error', reject);
  });
};
