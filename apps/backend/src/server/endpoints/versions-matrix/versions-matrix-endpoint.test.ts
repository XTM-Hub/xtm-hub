import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  loadRegisteredProductVersionsMock,
  loadDistinctConnectorSlugsMock,
  loadBestCompatibleConnectorsBySlugsMock,
} = vi.hoisted(() => ({
  loadRegisteredProductVersionsMock: vi.fn(),
  loadDistinctConnectorSlugsMock: vi.fn(),
  loadBestCompatibleConnectorsBySlugsMock: vi.fn(),
}));
vi.mock(
  '../../../modules/manage-product-version/manage-product-version.domain',
  () => ({
    ManageProductVersionDomain: {
      loadRegisteredProductVersions: loadRegisteredProductVersionsMock,
    },
  })
);
vi.mock('../../../modules/document/domain/document.domain', () => ({
  DocumentDomain: {
    loadDistinctConnectorSlugs: loadDistinctConnectorSlugsMock,
    loadBestCompatibleConnectorsBySlugs:
      loadBestCompatibleConnectorsBySlugsMock,
  },
}));
vi.mock('../../../utils/app-logger.util', () => ({
  logApp: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { VersionsMatrixEndpoint } from './versions-matrix-endpoint';
import { buildVersionsMatrixETag } from './versions-matrix-endpoint.utils';

const buildResponse = () => ({
  setHeader: vi.fn(),
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis(),
  end: vi.fn().mockReturnThis(),
});

const buildRequest = (
  query: Record<string, unknown> = {},
  params: Record<string, unknown> = { product: 'opencti' },
  fresh = false
) => ({ query, params, fresh }) as unknown as Request;

describe('getMatrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadRegisteredProductVersionsMock.mockResolvedValue([
      { version: '7.260904.0', version_padded: '007.260904.000' },
    ]);
    loadDistinctConnectorSlugsMock.mockResolvedValue(['mitre', 'sentinel']);
    loadBestCompatibleConnectorsBySlugsMock.mockResolvedValue([
      { slug: 'mitre', version: '7.260809.0' },
      { slug: 'sentinel', version: '7.260809.0' },
    ]);
  });

  it('returns 400 for an invalid product', async () => {
    const res = buildResponse();
    await VersionsMatrixEndpoint.getMatrix(
      buildRequest({ version: '7.260904.0' }, { product: 'not-a-product' }),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      code: 400,
      message: 'Invalid product',
    });
    expect(loadDistinctConnectorSlugsMock).not.toHaveBeenCalled();
  });

  it.each(['openaev', 'xtmone'])(
    'returns 404 for the valid but unsupported product "%s"',
    async (product) => {
      const res = buildResponse();
      await VersionsMatrixEndpoint.getMatrix(
        buildRequest({ version: '7.260904.0' }, { product }),
        res as unknown as Response
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        code: 404,
        message:
          'The versions matrix is only available for the opencti product',
      });
      expect(loadDistinctConnectorSlugsMock).not.toHaveBeenCalled();
    }
  );

  it('returns the JSON matrix by default for all connectors', async () => {
    const res = buildResponse();
    await VersionsMatrixEndpoint.getMatrix(
      buildRequest({ version: '7.260904.0' }),
      res as unknown as Response
    );

    expect(loadBestCompatibleConnectorsBySlugsMock).toHaveBeenCalledWith(
      ['mitre', 'sentinel'],
      '7.260904.0'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      opencti_version: '7.260904.0',
      connector_mitre_version: '7.260809.0',
      connector_sentinel_version: '7.260809.0',
    });
    expect(res.setHeader).toHaveBeenCalledWith(
      'ETag',
      buildVersionsMatrixETag(
        JSON.stringify({
          opencti_version: '7.260904.0',
          connector_mitre_version: '7.260809.0',
          connector_sentinel_version: '7.260809.0',
        })
      )
    );
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
  });

  it('returns the env matrix when format=env', async () => {
    const res = buildResponse();
    await VersionsMatrixEndpoint.getMatrix(
      buildRequest({ version: '7.260904.0', format: 'env' }),
      res as unknown as Response
    );

    const expectedBody = [
      'OPENCTI_VERSION="7.260904.0"',
      'CONNECTOR_MITRE_VERSION="7.260809.0"',
      'CONNECTOR_SENTINEL_VERSION="7.260809.0"',
    ].join('\n');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/plain; charset=utf-8'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(expectedBody);
    expect(res.setHeader).toHaveBeenCalledWith(
      'ETag',
      buildVersionsMatrixETag(expectedBody)
    );
  });

  it('returns the csv matrix when format=csv', async () => {
    const res = buildResponse();
    await VersionsMatrixEndpoint.getMatrix(
      buildRequest({ version: '7.260904.0', format: 'csv' }),
      res as unknown as Response
    );

    const expectedBody = [
      'opencti_version,connector_mitre_version,connector_sentinel_version',
      '7.260904.0,7.260809.0,7.260809.0',
    ].join('\n');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/csv; charset=utf-8'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(expectedBody);
    expect(res.setHeader).toHaveBeenCalledWith(
      'ETag',
      buildVersionsMatrixETag(expectedBody)
    );
  });

  it('returns 304 without a body when the client is up to date', async () => {
    const res = buildResponse();
    await VersionsMatrixEndpoint.getMatrix(
      buildRequest({ version: '7.260904.0' }, { product: 'opencti' }, true),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(304);
    expect(res.end).toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('filters the matrix down to the requested connector_slugs', async () => {
    const res = buildResponse();
    await VersionsMatrixEndpoint.getMatrix(
      buildRequest({ version: '7.260904.0', connector_slugs: 'mitre' }),
      res as unknown as Response
    );

    expect(loadBestCompatibleConnectorsBySlugsMock).toHaveBeenCalledWith(
      ['mitre'],
      '7.260904.0'
    );
    expect(res.json).toHaveBeenCalledWith({
      opencti_version: '7.260904.0',
      connector_mitre_version: '7.260809.0',
    });
  });

  it('defaults version to the latest registered OpenCTI version', async () => {
    loadRegisteredProductVersionsMock.mockResolvedValue([
      { version: '7.260904.0', version_padded: '007.260904.000' },
      { version: '7.260801.0', version_padded: '007.260801.000' },
    ]);

    const res = buildResponse();
    await VersionsMatrixEndpoint.getMatrix(
      buildRequest({}),
      res as unknown as Response
    );

    expect(loadBestCompatibleConnectorsBySlugsMock).toHaveBeenCalledWith(
      ['mitre', 'sentinel'],
      '7.260904.0'
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ opencti_version: '7.260904.0' })
    );
  });

  it('returns 404 when no OpenCTI version is registered and none is provided', async () => {
    loadRegisteredProductVersionsMock.mockResolvedValue([]);

    const res = buildResponse();
    await VersionsMatrixEndpoint.getMatrix(
      buildRequest({}),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(loadBestCompatibleConnectorsBySlugsMock).not.toHaveBeenCalled();
  });

  it('returns 400 on an invalid version format', async () => {
    const res = buildResponse();
    await VersionsMatrixEndpoint.getMatrix(
      buildRequest({ version: 'not-a-version' }),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      code: 400,
      message: 'Invalid version format',
    });
  });

  it('returns 404 for a well-formed but unregistered version', async () => {
    const res = buildResponse();
    await VersionsMatrixEndpoint.getMatrix(
      buildRequest({ version: '1.0.0' }),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      code: 404,
      message: 'Unknown opencti version: 1.0.0',
    });
    expect(loadDistinctConnectorSlugsMock).not.toHaveBeenCalled();
  });

  it('accepts a registered version requested with different (but equivalent) raw formatting', async () => {
    // '7.260904.0' and '7.260904.00' both pad to '007.260904.000', so the
    // registration check must compare padded forms, not raw strings.
    const res = buildResponse();
    await VersionsMatrixEndpoint.getMatrix(
      buildRequest({ version: '7.260904.00' }),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(loadDistinctConnectorSlugsMock).toHaveBeenCalledWith('7.260904.00');
  });

  it('returns 400 on an invalid format', async () => {
    const res = buildResponse();
    await VersionsMatrixEndpoint.getMatrix(
      buildRequest({ version: '7.260904.0', format: 'xml' }),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(loadDistinctConnectorSlugsMock).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown connector slug', async () => {
    const res = buildResponse();
    await VersionsMatrixEndpoint.getMatrix(
      buildRequest({ version: '7.260904.0', connector_slugs: 'mitre,unknown' }),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      code: 404,
      message: 'Unknown connector slug(s): unknown',
    });
    expect(loadBestCompatibleConnectorsBySlugsMock).not.toHaveBeenCalled();
  });

  it('returns 409 for an incompatible connector slug', async () => {
    loadBestCompatibleConnectorsBySlugsMock.mockResolvedValue([
      { slug: 'mitre', version: '7.260809.0' },
    ]);

    const res = buildResponse();
    await VersionsMatrixEndpoint.getMatrix(
      buildRequest({
        version: '7.260904.0',
        connector_slugs: 'mitre,sentinel',
      }),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      code: 409,
      message:
        'Incompatible connector slug(s) for OpenCTI version 7.260904.0: sentinel',
    });
  });

  it('returns 500 when a domain call throws', async () => {
    loadDistinctConnectorSlugsMock.mockRejectedValue(new Error('boom'));

    const res = buildResponse();
    await VersionsMatrixEndpoint.getMatrix(
      buildRequest({ version: '7.260904.0' }),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
