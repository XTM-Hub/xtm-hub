import { UnauthenticatedError } from '@/lib/graphql-fetch.utils';
import { buildSignupRedirect } from '@/utils/redirect';
import {
  PlatformAssociatedOrganizationDocument,
  ServiceDefinitionIdentifier,
  ServiceInstancesListDocument,
} from '@graphql/generated';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadPlatformOrganizationId, loadServiceInstances } from './load';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('@/lib/graphql-client', () => ({
  getAuthenticatedGraphqlClient: vi.fn(async () => ({ request })),
}));

const PLATFORM_ID = 'platform-1';
const TENANT_ID = 'tenant-1';
const ORGANIZATION_ID = 'organization-1';
const REDIRECT_PATHNAME = '/redirect/openaev_scenarios';
const REDIRECT_SENTINEL = new Error('NEXT_REDIRECT');

describe('loadPlatformOrganizationId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not query the API when no platform id is given', async () => {
    // When
    const result = await loadPlatformOrganizationId(null, TENANT_ID);

    // Then
    expect(result).toBeUndefined();
    expect(request).not.toHaveBeenCalled();
  });

  it('should return the id of the organization associated with the platform', async () => {
    // Given
    request.mockResolvedValue({
      platformAssociatedOrganization: { id: ORGANIZATION_ID },
    });

    // When
    const result = await loadPlatformOrganizationId(PLATFORM_ID, TENANT_ID);

    // Then
    expect(result).toBe(ORGANIZATION_ID);
  });

  it('should query the platform with a null tenant when no tenant id is given', async () => {
    // Given
    request.mockResolvedValue({
      platformAssociatedOrganization: { id: ORGANIZATION_ID },
    });

    // When
    await loadPlatformOrganizationId(PLATFORM_ID);

    // Then
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        document: PlatformAssociatedOrganizationDocument,
        variables: { platformId: PLATFORM_ID, tenantId: null },
      })
    );
  });

  it('should return undefined when the query fails', async () => {
    // Given
    request.mockRejectedValue(new Error('FORBIDDEN'));

    // When
    const result = await loadPlatformOrganizationId(PLATFORM_ID, TENANT_ID);

    // Then
    expect(result).toBeUndefined();
  });
});

describe('loadServiceInstances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should skip the empty edges when listing the service instances of the identifier', async () => {
    // Given
    const serviceInstance = {
      id: 'instance-1',
      name: 'Instance',
      service_definition: {
        identifier: ServiceDefinitionIdentifier.OpenaevScenarios,
      },
    };
    request.mockResolvedValue({
      serviceInstances: {
        edges: [{ node: serviceInstance }, { node: null }],
      },
    });

    // When
    const result = await loadServiceInstances(
      ServiceDefinitionIdentifier.OpenaevScenarios
    );

    // Then
    expect(result).toEqual([serviceInstance]);
  });

  it('should filter the service instances on the identifier', async () => {
    // Given
    request.mockResolvedValue({
      serviceInstances: { edges: [] },
    });

    // When
    await loadServiceInstances(ServiceDefinitionIdentifier.OpenaevScenarios);

    // Then
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        document: ServiceInstancesListDocument,
        variables: expect.objectContaining({
          filters: [
            {
              key: 'service_definition_identifier',
              value: [ServiceDefinitionIdentifier.OpenaevScenarios],
            },
          ],
        }),
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
    const result = loadServiceInstances(
      ServiceDefinitionIdentifier.OpenaevScenarios
    );

    // Then
    await expect(result).rejects.toBe(REDIRECT_SENTINEL);
    expect(redirect).toHaveBeenCalledWith(
      buildSignupRedirect(REDIRECT_PATHNAME)
    );
  });
});
