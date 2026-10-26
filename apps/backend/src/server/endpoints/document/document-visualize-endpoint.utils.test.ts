import { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import {
  buildImageETag,
  setImageCacheHeaders,
} from './document-visualize-endpoint.utils';

describe('buildImageETag', () => {
  it('should return a quoted sha256 hex digest', () => {
    expect(buildImageETag('minio-name')).toMatch(/^"[0-9a-f]{64}"$/);
  });

  it('should be stable for the same storage name', () => {
    expect(buildImageETag('minio-name')).toBe(buildImageETag('minio-name'));
  });

  it('should change when the storage name changes', () => {
    expect(buildImageETag('first-file')).not.toBe(
      buildImageETag('second-file')
    );
  });
});

describe('setImageCacheHeaders', () => {
  it('should set the ETag and force clients to revalidate', () => {
    // Given
    const res = { setHeader: vi.fn() } as unknown as Response;

    // When
    setImageCacheHeaders(res, 'minio-name');

    // Then
    expect(res.setHeader).toHaveBeenCalledWith(
      'ETag',
      buildImageETag('minio-name')
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'public, no-cache'
    );
  });
});
