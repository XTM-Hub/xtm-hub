import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { config, proxy } from '../proxy';

const proxyMocks = vi.hoisted(() => ({
  manageRequestMock: vi.fn(),
  intlMiddlewareMock: vi.fn(),
}));

vi.mock('@/utils/middleware/graphql-request.util', () => ({
  manageRequest: proxyMocks.manageRequestMock,
}));

vi.mock('next-intl/middleware', () => ({
  default: vi.fn(() => proxyMocks.intlMiddlewareMock),
}));

const BASE_URL = 'http://localhost:3002';

describe('proxy', () => {
  beforeEach(() => {
    proxyMocks.manageRequestMock.mockResolvedValue(null);
    proxyMocks.intlMiddlewareMock.mockReturnValue(NextResponse.next());
  });

  it('should redirect trailing encoded backslash on public cybersecurity slug path', async () => {
    const request = new NextRequest(
      `${BASE_URL}/en/cybersecurity-solutions/my-slug%5C?foo=bar`
    );

    const response = await proxy(request, {} as never);

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(
      `${BASE_URL}/en/cybersecurity-solutions/my-slug?foo=bar`
    );
    expect(proxyMocks.intlMiddlewareMock).not.toHaveBeenCalled();
  });

  it('should redirect trailing encoded backslash on public cybersecurity docSlug path', async () => {
    const request = new NextRequest(
      `${BASE_URL}/en/cybersecurity-solutions/my-slug/my-doc%5C?foo=bar`
    );

    const response = await proxy(request, {} as never);

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(
      `${BASE_URL}/en/cybersecurity-solutions/my-slug/my-doc?foo=bar`
    );
    expect(proxyMocks.intlMiddlewareMock).not.toHaveBeenCalled();
  });

  it('should not redirect when another backslash marker exists in the same public slug path', async () => {
    const request = new NextRequest(
      `${BASE_URL}/en/cybersecurity-solutions/my%5Cslug%5C`
    );

    await proxy(request, {} as never);

    expect(proxyMocks.intlMiddlewareMock).toHaveBeenCalledOnce();
  });

  it('should not redirect trailing encoded backslash outside public cybersecurity slug path', async () => {
    const request = new NextRequest(`${BASE_URL}/en/other-path%5C`);

    await proxy(request, {} as never);

    expect(proxyMocks.intlMiddlewareMock).toHaveBeenCalledOnce();
  });

  it('should run on the public news feed redirect route, and only on it among the redirect routes', () => {
    expect(config.matcher).toContain('/redirect/news-feed/:itemId');
    expect(
      config.matcher.filter((path) => path.startsWith('/redirect'))
    ).toEqual(['/redirect/news-feed/:itemId']);
  });
});
