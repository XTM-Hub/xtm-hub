import { Readable } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { MinIOClient } from './client';
import { UploadedFile } from './types';

const jsonFile = (content: string): UploadedFile => ({
  createReadStream: () => Readable.from([Buffer.from(content)]),
  filename: 'pack.json',
  mimetype: 'application/json',
  encoding: '7bit',
});

const limit = { maxBytes: 64, errorCode: 'FILE_TOO_LARGE_FOR_TEST' };
const serviceInstanceId = 'service-instance' as ServiceInstanceId;

describe('minIOClient.sendFile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses and stores a JSON file within its size limit', async () => {
    const insertFile = vi
      .spyOn(MinIOClient, 'insertFile')
      .mockResolvedValue('stored-key');

    const result = await MinIOClient.sendFile(
      jsonFile('{"type":"bundle","objects":[]}'),
      'pack.json',
      'user',
      serviceInstanceId,
      limit
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

    const call = MinIOClient.sendFile(
      jsonFile(`{"padding":"${'x'.repeat(100)}"}`),
      'pack.json',
      'user',
      serviceInstanceId,
      limit
    );

    await expect(call).rejects.toThrow(limit.errorCode);
    expect(insertFile).not.toHaveBeenCalled();
  });

  it('reads a JSON file that starts with a byte order mark', async () => {
    vi.spyOn(MinIOClient, 'insertFile').mockResolvedValue('stored-key');

    const result = await MinIOClient.sendFile(
      jsonFile('\uFEFF{"type":"bundle"}'),
      'pack.json',
      'user',
      serviceInstanceId
    );

    expect(result.jsonContent).toEqual({ type: 'bundle' });
  });
});
