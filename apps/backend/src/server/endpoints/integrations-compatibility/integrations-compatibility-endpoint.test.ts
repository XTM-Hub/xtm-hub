import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  loadRegisteredProductVersionsMock,
  loadIntegrationTypesBySlugsMock,
  loadConnectorsBySlugAndPaddedVersionsMock,
  loadBestCompatibleConnectorsBySlugsMock,
} = vi.hoisted(() => ({
  loadRegisteredProductVersionsMock: vi.fn(),
  loadIntegrationTypesBySlugsMock: vi.fn(),
  loadConnectorsBySlugAndPaddedVersionsMock: vi.fn(),
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
    loadIntegrationTypesBySlugs: loadIntegrationTypesBySlugsMock,
    loadConnectorsBySlugAndPaddedVersions:
      loadConnectorsBySlugAndPaddedVersionsMock,
    loadBestCompatibleConnectorsBySlugs:
      loadBestCompatibleConnectorsBySlugsMock,
  },
}));
vi.mock('../../../utils/app-logger.util', () => ({
  logApp: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { IntegrationType } from '../../../__generated__/resolvers-types';
import { IntegrationsCompatibilityEndpoint } from './integrations-compatibility-endpoint';

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

const callEndpoint = async (
  query: Record<string, unknown>,
  params: Record<string, unknown> = { product: 'opencti' },
  fresh = false
) => {
  const res = buildResponse();
  await IntegrationsCompatibilityEndpoint.getCompatibility(
    buildRequest(query, params, fresh),
    res as unknown as Response
  );
  return res;
};

describe('getCompatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadRegisteredProductVersionsMock.mockResolvedValue([
      { version: '7.260309.0', version_padded: '007.260309.000' },
    ]);
    loadIntegrationTypesBySlugsMock.mockResolvedValue(
      new Map([['mitre', IntegrationType.Connector]])
    );
    loadConnectorsBySlugAndPaddedVersionsMock.mockResolvedValue([
      {
        slug: 'mitre',
        version: '7.260101.0',
        version_padded: '007.260101.000',
        active: true,
        is_decommissioned: false,
      },
    ]);
    loadBestCompatibleConnectorsBySlugsMock.mockResolvedValue([
      { slug: 'mitre', version: '7.260200.0' },
    ]);
  });

  it('returns 400 for an invalid product', async () => {
    const res = await callEndpoint(
      { integration_versions: 'mitre@7.260101.0' },
      { product: 'not-a-product' }
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      code: 400,
      message: 'Invalid product',
    });
    expect(loadIntegrationTypesBySlugsMock).not.toHaveBeenCalled();
  });

  it.each(['openaev', 'xtmone'])(
    'returns 404 for the valid but unsupported product "%s"',
    async (product) => {
      const res = await callEndpoint(
        { integration_versions: 'mitre@7.260101.0' },
        { product }
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(loadIntegrationTypesBySlugsMock).not.toHaveBeenCalled();
    }
  );

  it('returns 400 when integration_versions is missing', async () => {
    const res = await callEndpoint({});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      code: 400,
      message:
        'Missing integration_versions parameter, expected "slug@version" pairs separated by commas',
    });
  });

  it('returns 400 when a requested pair is malformed', async () => {
    const res = await callEndpoint({ integration_versions: 'mitre' });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      code: 400,
      message:
        'Invalid integration_versions parameter, expected "slug@version" pairs separated by commas',
    });
    expect(loadIntegrationTypesBySlugsMock).not.toHaveBeenCalled();
  });

  it('returns 400 for a malformed opencti version', async () => {
    const res = await callEndpoint({
      integration_versions: 'mitre@7.260101.0',
      version: 'not-a-version',
    });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      code: 400,
      message: 'Invalid version format',
    });
  });

  it('returns 404 for a well-formed but unregistered opencti version', async () => {
    const res = await callEndpoint({
      integration_versions: 'mitre@7.260101.0',
      version: '9.999999.9',
    });

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      code: 404,
      message: 'Unknown opencti version: 9.999999.9',
    });
  });

  it('returns 404 when the product has no registered version to default to', async () => {
    loadRegisteredProductVersionsMock.mockResolvedValue([]);

    const res = await callEndpoint({ integration_versions: 'mitre@7.260101.0' });

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      code: 404,
      message: 'No registered version found for this product',
    });
  });

  it('defaults to the latest registered version and echoes it back', async () => {
    const res = await callEndpoint({ integration_versions: 'mitre@7.260101.0' });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ opencti_version: '7.260309.0' })
    );
    expect(loadBestCompatibleConnectorsBySlugsMock).toHaveBeenCalledWith(
      ['mitre'],
      '7.260309.0'
    );
  });

  it('answers each requested pair in the order it was asked', async () => {
    loadIntegrationTypesBySlugsMock.mockResolvedValue(
      new Map([
        ['mitre', IntegrationType.Connector],
        ['some-feed', IntegrationType.CsvFeed],
      ])
    );

    const res = await callEndpoint({
      integration_versions: 'mitre@7.260101.0,some-feed@1.0.0,ghost@7.260101.0',
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      opencti_version: '7.260309.0',
      integrations: [
        {
          slug: 'mitre',
          integration_version: '7.260101.0',
          compatible: true,
          latest_compatible_integration_version: '7.260200.0',
        },
        {
          slug: 'some-feed',
          integration_version: '1.0.0',
          integration_type: IntegrationType.CsvFeed,
          incompatibility_reason: 'integration_type_not_supported',
        },
        {
          slug: 'ghost',
          integration_version: '7.260101.0',
          incompatibility_reason: 'unknown_integration_slug',
        },
      ],
    });
  });

  it('answers incompatible when the connector requires a newer opencti', async () => {
    loadConnectorsBySlugAndPaddedVersionsMock.mockResolvedValue([
      {
        slug: 'mitre',
        version: '7.260101.0',
        version_padded: '007.260101.000',
        active: true,
        is_decommissioned: false,
        minimum_deployable_version: '7.260601.0',
        minimum_deployable_version_padded: '007.260601.000',
      },
    ]);

    const res = await callEndpoint({ integration_versions: 'mitre@7.260101.0' });

    expect(res.json).toHaveBeenCalledWith({
      opencti_version: '7.260309.0',
      integrations: [
        {
          slug: 'mitre',
          integration_version: '7.260101.0',
          compatible: false,
          incompatibility_reason: 'opencti_version_too_old',
          minimum_deployable_version: '7.260601.0',
          latest_compatible_integration_version: '7.260200.0',
        },
      ],
    });
  });

  it('queries the exact slug/padded-version pairs that were requested', async () => {
    await callEndpoint({
      integration_versions: 'mitre@7.260101.0,mitre@7.260200.0',
    });

    expect(loadConnectorsBySlugAndPaddedVersionsMock).toHaveBeenCalledWith([
      { slug: 'mitre', versionPadded: '007.260101.000' },
      { slug: 'mitre', versionPadded: '007.260200.000' },
    ]);
    expect(loadIntegrationTypesBySlugsMock).toHaveBeenCalledWith(['mitre']);
  });

  it('sets a strong ETag and no-cache', async () => {
    const res = await callEndpoint({ integration_versions: 'mitre@7.260101.0' });

    expect(res.setHeader).toHaveBeenCalledWith(
      'ETag',
      expect.stringMatching(/^"[a-f0-9]{64}"$/)
    );
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
  });

  it('returns 304 when the client copy is still fresh', async () => {
    const res = await callEndpoint(
      { integration_versions: 'mitre@7.260101.0' },
      { product: 'opencti' },
      true
    );

    expect(res.status).toHaveBeenCalledWith(304);
    expect(res.end).toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('returns 500 when a domain call fails', async () => {
    loadIntegrationTypesBySlugsMock.mockRejectedValue(new Error('boom'));

    const res = await callEndpoint({ integration_versions: 'mitre@7.260101.0' });

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      code: 500,
      message: 'Internal server error',
    });
  });
});
