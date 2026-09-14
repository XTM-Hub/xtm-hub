import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadManifestsMock, getManifestByNameMock, downloadFileMock } =
  vi.hoisted(() => ({
    loadManifestsMock: vi.fn(),
    getManifestByNameMock: vi.fn(),
    downloadFileMock: vi.fn(),
  }));
vi.mock('../../../modules/shareable-resource/manifest/manifest.domain', () => ({
  ManifestDomain: {
    getManifestByName: getManifestByNameMock,
    loadManifests: loadManifestsMock,
  },
}));
vi.mock('../../../thirdparty/minio/client', () => ({
  MinIOClient: { downloadFile: downloadFileMock },
}));
vi.mock('../../../modules/shareable-resource/manifest/manifest.helper', () => ({
  ManifestHelper: {
    buildManifestObjectKey: (p: string, v: string, n: string) =>
      `${p}/${v}/connector/manifest/${n}.json`,
  },
}));
vi.mock('../../../utils/app-logger.util', () => ({
  logApp: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import {
  ManifestType,
  PlatformIdentifier,
} from '../../../__generated__/resolvers-types';
import { StorageUnavailableError } from '../../../thirdparty/minio/storage-error';
import { ManifestEndpoint } from './manifest-endpoint';

const buildResponse = () => ({
  headersSent: false,
  setHeader: vi.fn(),
  removeHeader: vi.fn(),
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
  destroy: vi.fn(),
  end: vi.fn(),
});

const buildRequest = (
  params: Record<string, string>,
  query: Record<string, unknown> = {},
  fresh = false
) => ({ params, query, fresh }) as unknown as Request;

const VALID = {
  product: PlatformIdentifier.Opencti,
  version: '7.260604.0',
  integrationType: ManifestType.Connector,
};
const VALID_NAME = 'connector-manifest-7.260604.0-260526113805';

describe('downloadLatestManifest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('streams the latest manifest with a no-cache header', async () => {
    loadManifestsMock.mockResolvedValue([
      { name: VALID_NAME, created_at: new Date() },
    ]);
    const pipe = vi.fn();
    downloadFileMock.mockResolvedValue({ on: vi.fn(), pipe });

    const res = buildResponse();
    await ManifestEndpoint.downloadLatestManifest(
      buildRequest(VALID),
      res as unknown as Response
    );

    expect(downloadFileMock).toHaveBeenCalledWith(
      `opencti/7.260604.0/connector/manifest/${VALID_NAME}.json`
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/json'
    );
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(pipe).toHaveBeenCalledWith(res);
  });

  it('returns 404 when no manifest exists', async () => {
    loadManifestsMock.mockResolvedValue([]);

    const res = buildResponse();
    await ManifestEndpoint.downloadLatestManifest(
      buildRequest(VALID),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(downloadFileMock).not.toHaveBeenCalled();
  });

  it('returns 400 on an invalid product', async () => {
    const res = buildResponse();
    await ManifestEndpoint.downloadLatestManifest(
      buildRequest({ ...VALID, product: 'nope' }),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(loadManifestsMock).not.toHaveBeenCalled();
  });

  it('returns 503 when the storage is unavailable', async () => {
    loadManifestsMock.mockResolvedValue([
      { name: VALID_NAME, created_at: new Date() },
    ]);
    downloadFileMock.mockRejectedValue(
      new StorageUnavailableError('Cannot retrieve key')
    );

    const res = buildResponse();
    await ManifestEndpoint.downloadLatestManifest(
      buildRequest(VALID),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.removeHeader).toHaveBeenCalledWith('Cache-Control');
  });

  it('returns 404 when the manifest object is missing from storage', async () => {
    loadManifestsMock.mockResolvedValue([
      { name: VALID_NAME, created_at: new Date() },
    ]);
    downloadFileMock.mockResolvedValue(null);

    const res = buildResponse();
    await ManifestEndpoint.downloadLatestManifest(
      buildRequest(VALID),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 503 when the stream fails before headers are sent', async () => {
    loadManifestsMock.mockResolvedValue([
      { name: VALID_NAME, created_at: new Date() },
    ]);
    let onError: ((error: Error) => void) | undefined;
    const on = vi.fn((event: string, listener: (error: Error) => void) => {
      if (event === 'error') onError = listener;
    });
    downloadFileMock.mockResolvedValue({ on, pipe: vi.fn() });

    const res = buildResponse();
    await ManifestEndpoint.downloadLatestManifest(
      buildRequest(VALID),
      res as unknown as Response
    );

    onError?.(new Error('stream failure'));

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.destroy).not.toHaveBeenCalled();
  });

  it('sets a strong ETag built from the manifest name', async () => {
    loadManifestsMock.mockResolvedValue([
      { name: VALID_NAME, created_at: new Date() },
    ]);
    downloadFileMock.mockResolvedValue({ on: vi.fn(), pipe: vi.fn() });

    const res = buildResponse();
    await ManifestEndpoint.downloadLatestManifest(
      buildRequest(VALID),
      res as unknown as Response
    );

    expect(res.setHeader).toHaveBeenCalledWith('ETag', `"${VALID_NAME}"`);
  });

  it('returns 304 without reading from storage when the client is up to date', async () => {
    loadManifestsMock.mockResolvedValue([
      { name: VALID_NAME, created_at: new Date() },
    ]);

    const res = buildResponse();
    await ManifestEndpoint.downloadLatestManifest(
      buildRequest(VALID, {}, true),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(304);
    expect(res.end).toHaveBeenCalled();
    expect(downloadFileMock).not.toHaveBeenCalled();
  });

  it('returns 404 when the stored manifest name is malformed', async () => {
    loadManifestsMock.mockResolvedValue([
      { name: 'not-a-manifest-name', created_at: new Date() },
    ]);

    const res = buildResponse();
    await ManifestEndpoint.downloadLatestManifest(
      buildRequest(VALID),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.setHeader).not.toHaveBeenCalledWith('ETag', expect.anything());
    expect(downloadFileMock).not.toHaveBeenCalled();
  });
});

describe('downloadManifestByName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a path-traversal name with 400 before any lookup', async () => {
    const res = buildResponse();
    await ManifestEndpoint.downloadManifestByName(
      buildRequest({ ...VALID, name: '../../secret' }),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(getManifestByNameMock).not.toHaveBeenCalled();
    expect(downloadFileMock).not.toHaveBeenCalled();
  });

  it('streams a known manifest with an immutable cache header', async () => {
    getManifestByNameMock.mockResolvedValue({
      name: VALID_NAME,
      created_at: new Date(),
    });
    const pipe = vi.fn();
    downloadFileMock.mockResolvedValue({ on: vi.fn(), pipe });

    const res = buildResponse();
    await ManifestEndpoint.downloadManifestByName(
      buildRequest({ ...VALID, name: VALID_NAME }),
      res as unknown as Response
    );

    expect(res.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'public, max-age=31536000, immutable'
    );
    expect(pipe).toHaveBeenCalledWith(res);
  });

  it('returns 503 when the storage is unavailable', async () => {
    getManifestByNameMock.mockResolvedValue({
      name: VALID_NAME,
      created_at: new Date(),
    });
    downloadFileMock.mockRejectedValue(
      new StorageUnavailableError('Cannot retrieve key')
    );

    const res = buildResponse();
    await ManifestEndpoint.downloadManifestByName(
      buildRequest({ ...VALID, name: VALID_NAME }),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.removeHeader).toHaveBeenCalledWith('Cache-Control');
  });

  it('sets a strong ETag built from the manifest name', async () => {
    getManifestByNameMock.mockResolvedValue({
      name: VALID_NAME,
      created_at: new Date(),
    });
    downloadFileMock.mockResolvedValue({ on: vi.fn(), pipe: vi.fn() });

    const res = buildResponse();
    await ManifestEndpoint.downloadManifestByName(
      buildRequest({ ...VALID, name: VALID_NAME }),
      res as unknown as Response
    );

    expect(res.setHeader).toHaveBeenCalledWith('ETag', `"${VALID_NAME}"`);
  });

  it('returns 304 without reading from storage when the client is up to date', async () => {
    getManifestByNameMock.mockResolvedValue({
      name: VALID_NAME,
      created_at: new Date(),
    });

    const res = buildResponse();
    await ManifestEndpoint.downloadManifestByName(
      buildRequest({ ...VALID, name: VALID_NAME }, {}, true),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(304);
    expect(res.end).toHaveBeenCalled();
    expect(downloadFileMock).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'public, max-age=31536000, immutable'
    );
  });
});

describe('listManifests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with the manifests from the domain', async () => {
    const rows = [
      {
        name: 'connector-manifest-7.260604.0-260526113805',
        created_at: new Date(),
      },
    ];
    loadManifestsMock.mockResolvedValue(rows);

    const res = buildResponse();
    await ManifestEndpoint.listManifests(
      buildRequest(VALID),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ manifests: rows });
  });

  it('caps count and forwards it to the domain', async () => {
    loadManifestsMock.mockResolvedValue([]);

    const res = buildResponse();
    await ManifestEndpoint.listManifests(
      buildRequest(VALID, { count: '5' }),
      res as unknown as Response
    );

    expect(loadManifestsMock).toHaveBeenCalledWith(
      PlatformIdentifier.Opencti,
      '7.260604.0',
      ManifestType.Connector,
      5
    );
  });

  it('returns only the contract fields, without internal ones', async () => {
    loadManifestsMock.mockResolvedValue([
      {
        name: VALID_NAME,
        created_at: new Date('2026-07-21T09:27:01.593Z'),
        __typename: 'Manifest',
      },
    ]);

    const res = buildResponse();
    await ManifestEndpoint.listManifests(
      buildRequest(VALID),
      res as unknown as Response
    );

    expect(res.json).toHaveBeenCalledWith({
      manifests: [
        { name: VALID_NAME, created_at: new Date('2026-07-21T09:27:01.593Z') },
      ],
    });
  });

  it.each`
    params                                    | query             | description
    ${{ ...VALID, product: 'x' }}             | ${{}}             | ${'invalid product'}
    ${{ ...VALID, integrationType: 'x' }}     | ${{}}             | ${'invalid integrationType'}
    ${VALID}                                  | ${{ count: '0' }} | ${'invalid count'}
    ${{ ...VALID, version: 'not-a-version' }} | ${{}}             | ${'invalid version'}
  `('returns 400 on $description', async ({ params, query }) => {
    const res = buildResponse();
    await ManifestEndpoint.listManifests(
      buildRequest(params, query),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(loadManifestsMock).not.toHaveBeenCalled();
  });
});
