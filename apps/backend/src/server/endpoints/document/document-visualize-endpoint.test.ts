import type { Application, Request, Response } from 'express';
import { Readable } from 'stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadDocumentByMock, loadServiceDefinitionMock, downloadFileMock } =
  vi.hoisted(() => ({
    loadDocumentByMock: vi.fn(),
    loadServiceDefinitionMock: vi.fn(),
    downloadFileMock: vi.fn(),
  }));
vi.mock('../../../modules/document/domain/document.domain', () => ({
  DocumentDomain: { loadDocumentBy: loadDocumentByMock },
}));
vi.mock('../../../modules/service/instance/service-instance.domain', () => ({
  ServiceInstanceDomain: {
    loadServiceDefinitionByServiceInstance: loadServiceDefinitionMock,
  },
}));
vi.mock('../../../context/request.context', () => ({
  requestContext: { update: vi.fn() },
}));
vi.mock('../../../thirdparty/minio/client', () => ({
  MinIOClient: { downloadFile: downloadFileMock },
}));
vi.mock('../../../utils/app-logger.util', () => ({
  logApp: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { buildETag } from '../shared/http-cache.util';
import { STORED_FILE_CONTENT_SECURITY_POLICY } from '../shared/stored-file.util';
import { documentVisualizeEndpoint } from './document-visualize-endpoint';

type Handler = (req: Request, res: Response) => Promise<unknown>;

const getImageHandler = (): Handler => {
  const get = vi.fn();
  documentVisualizeEndpoint({ get } as unknown as Application);
  const imagesRoute = get.mock.calls.find(
    ([path]) => path === '/document/images/:serviceInstanceId/:documentId'
  );
  return imagesRoute![2] as Handler;
};

const getVisualizeHandler = (): Handler => {
  const get = vi.fn();
  documentVisualizeEndpoint({ get } as unknown as Application);
  const visualizeRoute = get.mock.calls.find(
    ([path]) => path === '/document/visualize/:serviceInstanceId/:filename'
  );
  return visualizeRoute![2] as Handler;
};

const buildRequest = (fresh = false) =>
  ({
    params: { serviceInstanceId: 'service-instance', documentId: 'document' },
    originalUrl: '/document/images/service-instance/document',
    get: vi.fn(),
    fresh,
  }) as unknown as Request;

const buildResponse = () => {
  const res = {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    write: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    emit: vi.fn(),
  };
  return res as typeof res & Response;
};

describe('documentVisualizeEndpoint images route', () => {
  const image = {
    id: 'document',
    mime_type: 'image/png',
    file_name: 'logo.png',
    minio_name: 'minio-name',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    loadServiceDefinitionMock.mockResolvedValue({ public: true });
    loadDocumentByMock.mockResolvedValue(image);
    downloadFileMock.mockResolvedValue(Readable.from(['image-content']));
  });

  it('should return 404 when the service is not public', async () => {
    loadServiceDefinitionMock.mockResolvedValue({ public: false });
    const res = buildResponse();

    await getImageHandler()(buildRequest(), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(downloadFileMock).not.toHaveBeenCalled();
  });

  it('should return 404 when the document is not an image', async () => {
    loadDocumentByMock.mockResolvedValue({ ...image, mime_type: 'text/csv' });
    const res = buildResponse();

    await getImageHandler()(buildRequest(), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(downloadFileMock).not.toHaveBeenCalled();
  });

  it('should set a revalidation ETag derived from the storage name', async () => {
    const res = buildResponse();

    await getImageHandler()(buildRequest(), res);

    expect(res.setHeader).toHaveBeenCalledWith('ETag', buildETag('minio-name'));
    expect(res.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'public, no-cache'
    );
    expect(downloadFileMock).toHaveBeenCalledWith('minio-name');
  });

  it('should serve the image with a sandboxing Content-Security-Policy', async () => {
    // Given
    loadDocumentByMock.mockResolvedValue({
      ...image,
      mime_type: 'image/svg+xml',
      file_name: 'logo.svg',
    });
    const res = buildResponse();

    // When
    await getImageHandler()(buildRequest(), res);

    // Then
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Security-Policy',
      STORED_FILE_CONTENT_SECURITY_POLICY
    );
    expect(STORED_FILE_CONTENT_SECURITY_POLICY).toContain('sandbox');
    expect(STORED_FILE_CONTENT_SECURITY_POLICY).toContain("default-src 'none'");
  });

  it('should answer 304 without downloading the file when the client copy is fresh', async () => {
    const res = buildResponse();

    await getImageHandler()(buildRequest(true), res);

    expect(res.status).toHaveBeenCalledWith(304);
    expect(res.end).toHaveBeenCalled();
    expect(downloadFileMock).not.toHaveBeenCalled();
  });
});

describe('documentVisualizeEndpoint visualize route', () => {
  const STORED_FILE_CSP =
    "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox";

  beforeEach(() => {
    vi.clearAllMocks();
    loadDocumentByMock.mockResolvedValue({
      id: 'document',
      mime_type: 'image/svg+xml',
      file_name: 'logo.svg',
      minio_name: 'minio-name',
    });
    downloadFileMock.mockResolvedValue(Readable.from(['image-content']));
  });

  it('should serve the file with a sandboxing Content-Security-Policy', async () => {
    // Given
    const req = {
      params: { serviceInstanceId: 'service-instance', filename: 'document' },
      session: { user: { id: 'user-1' } },
    } as unknown as Request;
    const res = buildResponse();

    // When
    await getVisualizeHandler()(req, res);

    // Then
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Security-Policy',
      STORED_FILE_CSP
    );
  });
});
