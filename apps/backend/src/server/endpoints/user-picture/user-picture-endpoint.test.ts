import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadUserPictureMinioMock, downloadFileMock } = vi.hoisted(() => ({
  loadUserPictureMinioMock: vi.fn(),
  downloadFileMock: vi.fn(),
}));

vi.mock(
  '../../../modules/organization-management/user/user-domain/user.domain',
  () => ({
    UserDomain: { loadUserPictureMinio: loadUserPictureMinioMock },
  })
);
vi.mock('../../../thirdparty/minio/client', () => ({
  MinIOClient: { downloadFile: downloadFileMock },
}));
vi.mock('../../../utils/app-logger.util', () => ({
  logApp: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { getUserPicture } from './user-picture-endpoint';

const CACHE_CONTROL = 'public, max-age=2592000, immutable';

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

  it('sets an immutable Cache-Control header on a successful response', async () => {
    loadUserPictureMinioMock.mockResolvedValue('picture/abc');
    downloadFileMock.mockResolvedValue({ on: vi.fn(), pipe: vi.fn() });

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
    downloadFileMock.mockResolvedValue(null);

    const res = buildResponse();
    await getUserPicture(buildRequest('user-1'), res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it('removes the cache header before a 404 when the stream errors early', async () => {
    loadUserPictureMinioMock.mockResolvedValue('picture/abc');
    let onError: (error: Error) => void = () => undefined;
    downloadFileMock.mockResolvedValue({
      on: vi.fn((event: string, cb: (error: Error) => void) => {
        if (event === 'error') {
          onError = cb;
        }
      }),
      pipe: vi.fn(),
    });

    const res = buildResponse();
    await getUserPicture(buildRequest('user-1'), res as unknown as Response);
    onError(new Error('minio unreachable'));

    expect(res.removeHeader).toHaveBeenCalledWith('Cache-Control');
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
