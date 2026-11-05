import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redirectFromPublic } from './public';
import { redirectToResource } from './resource';
import { GET } from './route';

vi.mock('./free-trial');
vi.mock('./handle-pending-user');
vi.mock('./public');
vi.mock('./registration');
vi.mock('./resource');
vi.mock('./transfer-perso-space');

const BASE_URL = 'http://localhost:3002';
const RESPONSE = NextResponse.redirect(`${BASE_URL}/app`);

const callRoute = (identifier: string, request: NextRequest) =>
  GET(request, { params: Promise.resolve({ identifier }) });

describe('GET /redirect/[identifier]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(redirectFromPublic).mockResolvedValue(RESPONSE);
    vi.mocked(redirectToResource).mockResolvedValue(RESPONSE);
  });

  it('should hand /redirect/public to the public page redirection', async () => {
    // Given
    const request = new NextRequest(
      `${BASE_URL}/redirect/public?path=%2Fen%2Fcybersecurity-solutions`
    );

    // When
    const response = await callRoute('public', request);

    // Then
    expect(redirectFromPublic).toHaveBeenCalledWith(request);
    expect(redirectToResource).not.toHaveBeenCalled();
    expect(response).toBe(RESPONSE);
  });

  it('should hand a service identifier to the resource redirection', async () => {
    // Given
    const request = new NextRequest(
      `${BASE_URL}/redirect/opencti_integrations?document_id=document-id`
    );

    // When
    await callRoute('opencti_integrations', request);

    // Then
    expect(redirectToResource).toHaveBeenCalledWith(
      { identifier: 'opencti_integrations' },
      request
    );
    expect(redirectFromPublic).not.toHaveBeenCalled();
  });
});
