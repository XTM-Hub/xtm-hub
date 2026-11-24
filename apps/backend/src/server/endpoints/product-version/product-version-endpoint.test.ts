import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadRegisteredProductVersionsMock } = vi.hoisted(() => ({
  loadRegisteredProductVersionsMock: vi.fn(),
}));
vi.mock(
  '../../../modules/manage-product-version/manage-product-version.domain',
  () => ({
    ManageProductVersionDomain: {
      loadRegisteredProductVersions: loadRegisteredProductVersionsMock,
    },
  })
);
vi.mock('../../../utils/app-logger.util', () => ({
  logApp: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { PlatformIdentifier } from '../../../__generated__/resolvers-types';
import { ProductVersionEndpoint } from './product-version-endpoint';

const buildResponse = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
});

const buildRequest = (params: Record<string, string>) =>
  ({ params }) as unknown as Request;

describe('listRegisteredVersions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the registered versions for a valid product', async () => {
    const createdAt = new Date('2026-01-01T00:00:00Z');
    loadRegisteredProductVersionsMock.mockResolvedValue([
      { version: '6.5.0', created_at: createdAt },
      { version: '6.4.0', created_at: createdAt },
    ]);

    const res = buildResponse();
    await ProductVersionEndpoint.listRegisteredVersions(
      buildRequest({ product: PlatformIdentifier.Opencti }),
      res as unknown as Response
    );

    expect(loadRegisteredProductVersionsMock).toHaveBeenCalledWith(
      PlatformIdentifier.Opencti
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      product: PlatformIdentifier.Opencti,
      versions: [
        { version: '6.5.0', created_at: createdAt },
        { version: '6.4.0', created_at: createdAt },
      ],
    });
  });

  it('returns 400 on an invalid product', async () => {
    const res = buildResponse();
    await ProductVersionEndpoint.listRegisteredVersions(
      buildRequest({ product: 'nope' }),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(loadRegisteredProductVersionsMock).not.toHaveBeenCalled();
  });

  it('returns 500 when the domain call throws', async () => {
    loadRegisteredProductVersionsMock.mockRejectedValue(new Error('boom'));

    const res = buildResponse();
    await ProductVersionEndpoint.listRegisteredVersions(
      buildRequest({ product: PlatformIdentifier.Opencti }),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
