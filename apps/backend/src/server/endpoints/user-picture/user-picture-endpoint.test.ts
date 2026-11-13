import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadUserPictureMinioMock, downloadFileWithMimeTypeMock } = vi.hoisted(
  () => ({
    loadUserPictureMinioMock: vi.fn(),
    downloadFileWithMimeTypeMock: vi.fn(),
  })
);

vi.mock(
  '../../../modules/organization-management/user/user-domain/user.domain',
  () => ({
    UserDomain: { loadUserPictureMinio: loadUserPictureMinioMock },
  })
);
vi.mock('../../../thirdparty/minio/client', () => ({
  MinIOClient: { downloadFileWithMimeType: downloadFileWithMimeTypeMock },
}));
vi.mock('../../../utils/app-logger.util', () => ({
  logApp: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { getUserPicture } from './user-picture-endpoint';

const CACHE_CONTROL = 'public, max-age=86400';
const STORED_FILE_CSP =
  "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox";

const buildStoredPicture = (
  body: Record<string, unknown>,
  { mimeType }: { mimeType?: string } = { mimeType: 'image/png' }
) => ({ body, mimeType });

const buildResponse = () => ({
  headersSent: false,
  setHeader: vi.fn(),
  removeHeader: vi.fn(),
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
  destroy: vi.fn(),
});

const buildRequest = (userId: string) =>
  ({ params: { userId } }) as unknown as Request;

describe('getUserPicture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets a one day Cache-Control header, not immutable, on a successful response', async () => {
    loadUserPictureMinioMock.mockResolvedValue('picture/abc');
    downloadFileWithMimeTypeMock.mockResolvedValue(
      buildStoredPicture({ on: vi.fn(), pipe: vi.fn() })
    );

    const res = buildResponse();
    await getUserPicture(buildRequest('user-1'), res as unknown as Response);

    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', CACHE_CONTROL);
  });

  it('returns 404 and no cache header when the user has no picture', async () => {
    loadUserPictureMinioMock.mockResolvedValue(null);

    const res = buildResponse();
    await getUserPicture(buildRequest('user-1'), res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it('returns 404 and no cache header when the MinIO download fails', async () => {
    loadUserPictureMinioMock.mockResolvedValue('picture/abc');
    downloadFileWithMimeTypeMock.mockResolvedValue(null);

    const res = buildResponse();
    await getUserPicture(buildRequest('user-1'), res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it('removes the cache header before a 404 when the stream errors early', async () => {
    loadUserPictureMinioMock.mockResolvedValue('picture/abc');
    let onError: (error: Error) => void = () => undefined;
    downloadFileWithMimeTypeMock.mockResolvedValue(
      buildStoredPicture({
        on: vi.fn((event: string, cb: (error: Error) => void) => {
          if (event === 'error') {
            onError = cb;
          }
        }),
        pipe: vi.fn(),
      })
    );

    const res = buildResponse();
    await getUserPicture(buildRequest('user-1'), res as unknown as Response);
    onError(new Error('minio unreachable'));

    expect(res.removeHeader).toHaveBeenCalledWith('Cache-Control');
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it.each`
    storedMimeType     | contentType
    ${'image/png'}     | ${'image/png'}
    ${'image/svg+xml'} | ${'image/svg+xml'}
    ${'IMAGE/JPEG'}    | ${'IMAGE/JPEG'}
    ${'text/html'}     | ${'application/octet-stream'}
    ${undefined}       | ${'application/octet-stream'}
  `(
    'should serve a picture stored as $storedMimeType with the $contentType Content-Type',
    async ({
      storedMimeType,
      contentType,
    }: {
      storedMimeType: string | undefined;
      contentType: string;
    }) => {
      // Given
      loadUserPictureMinioMock.mockResolvedValue('picture/abc');
      downloadFileWithMimeTypeMock.mockResolvedValue(
        buildStoredPicture(
          { on: vi.fn(), pipe: vi.fn() },
          { mimeType: storedMimeType }
        )
      );
      const res = buildResponse();

      // When
      await getUserPicture(buildRequest('user-1'), res as unknown as Response);

      // Then
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', contentType);
    }
  );

  it('should serve the picture with a sandboxing Content-Security-Policy', async () => {
    // Given
    loadUserPictureMinioMock.mockResolvedValue('picture/abc');
    downloadFileWithMimeTypeMock.mockResolvedValue(
      buildStoredPicture(
        { on: vi.fn(), pipe: vi.fn() },
        { mimeType: 'image/svg+xml' }
      )
    );
    const res = buildResponse();

    // When
    await getUserPicture(buildRequest('user-1'), res as unknown as Response);

    // Then
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Security-Policy',
      STORED_FILE_CSP
    );
  });

  it('should remove the picture Content-Type before a 404 when the stream errors early', async () => {
    // Given
    loadUserPictureMinioMock.mockResolvedValue('picture/abc');
    let onError: (error: Error) => void = () => undefined;
    downloadFileWithMimeTypeMock.mockResolvedValue(
      buildStoredPicture({
        on: vi.fn((event: string, cb: (error: Error) => void) => {
          if (event === 'error') {
            onError = cb;
          }
        }),
        pipe: vi.fn(),
      })
    );
    const res = buildResponse();

    // When
    await getUserPicture(buildRequest('user-1'), res as unknown as Response);
    onError(new Error('minio unreachable'));

    // Then
    expect(res.removeHeader).toHaveBeenCalledWith('Content-Type');
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
