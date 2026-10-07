import { Readable } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { MinIOClient } from './client';
import { UploadedFile } from './types';

const uploadedFile = (
  content: string,
  mimetype = 'application/json'
): UploadedFile => ({
  createReadStream: () => Readable.from([Buffer.from(content)]),
  filename: 'pack.json',
  mimetype,
  encoding: '7bit',
});

const limit = { maxBytes: 64, errorCode: 'FILE_TOO_LARGE_FOR_TEST' };
const serviceInstanceId = 'service-instance' as ServiceInstanceId;

const sendFile = (
  file: UploadedFile,
  rules?: Parameters<typeof MinIOClient.sendFile>[4]
) => MinIOClient.sendFile(file, 'pack.json', 'user', serviceInstanceId, rules);

describe('minIOClient.sendFile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses and stores a JSON file within its size limit', async () => {
    const insertFile = vi
      .spyOn(MinIOClient, 'insertFile')
      .mockResolvedValue('stored-key');

    const result = await sendFile(
      uploadedFile('{"type":"bundle","objects":[]}'),
      { limit }
    );

    expect(result).toEqual({
      minioName: 'stored-key',
      jsonContent: { type: 'bundle', objects: [] },
    });
    expect(insertFile).toHaveBeenCalledOnce();
  });

  it('refuses a file above its size limit before parsing or storing it', async () => {
    const insertFile = vi
      .spyOn(MinIOClient, 'insertFile')
      .mockResolvedValue('stored-key');

    const call = sendFile(uploadedFile(`{"padding":"${'x'.repeat(100)}"}`), {
      limit,
    });

    await expect(call).rejects.toThrow(limit.errorCode);
    expect(insertFile).not.toHaveBeenCalled();
  });

  it('stops reading the source of a file refused for its size', async () => {
    vi.spyOn(MinIOClient, 'insertFile').mockResolvedValue('stored-key');
    const source = Readable.from(
      (function* () {
        yield Buffer.from('{"padding":"');
        for (let index = 0; index < 1000; index += 1) {
          yield Buffer.from('x'.repeat(32));
        }
      })()
    );

    const call = sendFile(
      { ...uploadedFile(''), createReadStream: () => source },
      { limit }
    );

    await expect(call).rejects.toThrow(limit.errorCode);
    await vi.waitFor(() => expect(source.destroyed).toBe(true));
  });

  it('reports an error of the source of a limited upload', async () => {
    const source = new Readable({
      read() {
        this.destroy(new Error('UPLOAD_ABORTED'));
      },
    });

    const call = sendFile(
      { ...uploadedFile(''), createReadStream: () => source },
      { limit }
    );

    await expect(call).rejects.toThrow('UPLOAD_ABORTED');
  });

  it('reads a file as JSON whatever media type the browser declared when the library expects JSON', async () => {
    const insertFile = vi
      .spyOn(MinIOClient, 'insertFile')
      .mockResolvedValue('stored-key');

    const result = await sendFile(
      uploadedFile('{"type":"bundle"}', 'application/octet-stream'),
      { json: true }
    );

    expect(result.jsonContent).toEqual({ type: 'bundle' });
    expect(insertFile.mock.calls[0]?.[0].Metadata.mimetype).toBe(
      'application/json'
    );
  });

  it('reads a JSON media type with parameters as JSON', async () => {
    vi.spyOn(MinIOClient, 'insertFile').mockResolvedValue('stored-key');

    const result = await sendFile(
      uploadedFile('{"type":"bundle"}', 'application/json; charset=utf-8')
    );

    expect(result.jsonContent).toEqual({ type: 'bundle' });
  });

  it('reads a JSON file that starts with a byte order mark', async () => {
    vi.spyOn(MinIOClient, 'insertFile').mockResolvedValue('stored-key');

    const result = await sendFile(uploadedFile('\uFEFF{"type":"bundle"}'));

    expect(result.jsonContent).toEqual({ type: 'bundle' });
  });
});
