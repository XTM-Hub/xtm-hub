import { UnauthenticatedError } from '@/lib/graphql-fetch.utils';
import { buildSignupRedirect } from '@/utils/redirect';
import { ChangeSelectedOrganizationDocument } from '@graphql/generated';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { switchOrganization } from './switch-organization';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('@/lib/graphql-client', () => ({
  getAuthenticatedGraphqlClient: vi.fn(async () => ({ request })),
}));

const ORGANIZATION_ID = 'organization-1';
const REDIRECT_PATHNAME = '/redirect/openaev-registration';
const REDIRECT_SENTINEL = new Error('NEXT_REDIRECT');

describe('switchOrganization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should select the organization for the user', async () => {
    // Given
    request.mockResolvedValue({
      changeSelectedOrganization: {
        id: 'user-1',
        selected_organization_id: ORGANIZATION_ID,
        selected_org_capabilities: [],
      },
    });

    // When
    await switchOrganization(ORGANIZATION_ID);

    // Then
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        document: ChangeSelectedOrganizationDocument,
        variables: { organization_id: ORGANIZATION_ID },
      })
    );
  });

  it('should redirect to the signup page when the visitor is not authenticated', async () => {
    // Given
    request.mockRejectedValue(new UnauthenticatedError());
    vi.mocked(headers).mockResolvedValue(
      new Headers({ 'x-pathname': REDIRECT_PATHNAME })
    );
    // Next.js' redirect never returns: it throws to interrupt the request.
    vi.mocked(redirect).mockImplementationOnce(() => {
      throw REDIRECT_SENTINEL;
    });

    // When
    const result = switchOrganization(ORGANIZATION_ID);

    // Then
    await expect(result).rejects.toBe(REDIRECT_SENTINEL);
    expect(redirect).toHaveBeenCalledWith(
      buildSignupRedirect(REDIRECT_PATHNAME)
    );
  });
});
