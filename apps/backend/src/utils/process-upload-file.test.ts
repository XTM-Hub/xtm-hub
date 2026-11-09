import { Readable } from 'stream';
import { describe, expect, it } from 'vitest';
import { streamToBase64, streamToSha256 } from './process-upload-file';

describe('streamToSha256', () => {
  it('resolves with the hex sha256 of the stream content, whatever its chunks', async () => {
    const stream = Readable.from([Buffer.from('foo'), Buffer.from('bar')]);

    const result = await streamToSha256(stream);

    expect(result).toBe(
      'c3ab8ff13720e8ad9047dd39466b3c8974e592c2fa383d4a3960714caef0c4f2'
    );
  });

  it('rejects when the stream emits an error', async () => {
    const stream = new Readable({
      read() {
        this.emit('error', new Error('stream broke'));
      },
    });

    await expect(streamToSha256(stream)).rejects.toThrow('stream broke');
  });
});

describe('streamToBase64', () => {
  it('resolves with the base64 encoding of the stream content', async () => {
    const stream = Readable.from([Buffer.from('fake-image-bytes')]);

    const result = await streamToBase64(stream);

    expect(result).toBe(Buffer.from('fake-image-bytes').toString('base64'));
  });

  it('concatenates multiple chunks before encoding', async () => {
    const stream = Readable.from([Buffer.from('foo'), Buffer.from('bar')]);

    const result = await streamToBase64(stream);

    expect(result).toBe(Buffer.from('foobar').toString('base64'));
  });

  it('rejects when the stream emits an error', async () => {
    const stream = new Readable({
      read() {
        this.emit('error', new Error('stream broke'));
      },
    });

    await expect(streamToBase64(stream)).rejects.toThrow('stream broke');
  });
});
