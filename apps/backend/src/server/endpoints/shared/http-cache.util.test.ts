import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import {
  buildETag,
  CacheControl,
  quoteETag,
  respondNotModifiedIfFresh,
} from './http-cache.util';

const buildResponse = () => {
  const res = {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  };
  return res as typeof res & Response;
};

const buildRequest = (fresh: boolean) => ({ fresh }) as unknown as Request;

describe('quoteETag', () => {
  it('should wrap the value in quotes without altering it', () => {
    expect(quoteETag('connector-manifest-7.260604.0-260526113805')).toBe(
      '"connector-manifest-7.260604.0-260526113805"'
    );
  });
});

describe('buildETag', () => {
  it('should wrap a sha256 hash of the value in a strong ETag', () => {
    expect(buildETag('payload')).toBe(
      '"239f59ed55e737c77147cf55ad0c1b030b6d7ee748a7426952f9b852d5a935e5"'
    );
  });

  it('should change when the value changes', () => {
    expect(buildETag('payload-a')).not.toBe(buildETag('payload-b'));
  });

  it('should be deterministic for the same value', () => {
    expect(buildETag('same')).toBe(buildETag('same'));
  });
});

describe('respondNotModifiedIfFresh', () => {
  const options = {
    etag: '"etag"',
    cacheControl: CacheControl.PublicRevalidate,
  };

  it('should set the ETag and Cache-Control headers', () => {
    // Given
    const res = buildResponse();

    // When
    respondNotModifiedIfFresh(buildRequest(false), res, options);

    // Then
    expect(res.setHeader).toHaveBeenCalledWith('ETag', '"etag"');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'public, no-cache'
    );
  });

  it('should send a 304 and return true when the client copy is fresh', () => {
    // Given
    const res = buildResponse();

    // When
    const notModified = respondNotModifiedIfFresh(
      buildRequest(true),
      res,
      options
    );

    // Then
    expect(notModified).toBe(true);
    expect(res.status).toHaveBeenCalledWith(304);
    expect(res.end).toHaveBeenCalled();
  });

  it('should send nothing and return false when the client copy is stale', () => {
    // Given
    const res = buildResponse();

    // When
    const notModified = respondNotModifiedIfFresh(
      buildRequest(false),
      res,
      options
    );

    // Then
    expect(notModified).toBe(false);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
  });
});
